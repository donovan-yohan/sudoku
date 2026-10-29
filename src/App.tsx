import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import Board, { type MistakeEvent } from './components/Board'
import Learning from './components/Learning'
import Dialog from './components/Dialog'
import HintPanel from './components/HintPanel'
import RewardEffects from './components/RewardEffects'
import Calendar from './components/Calendar'
import NumberButton from './components/NumberButton'
import './digit-rewards.css'
import { createGame, readGame, reduceGame, saveGame } from './game'
import { loadSession, saveSession } from './session'
import {generatedDailyRequest,generatedPracticeRequest} from './generated-puzzles'
import {requestGeneratedPuzzle} from './generation-client'
import {availableDifficulties} from './solver-policy'
import { ARCHIVE_START, shiftArchiveDate } from './archive'
import type {GameVariant,VariantDeduction} from './variant-engine'
import type { Difficulty, GameAction, GameState, Puzzle } from './types'

type Page = 'daily' | 'practice' | 'learn'
type Theme = 'device' | 'light' | 'dark'
type Completion = {
  token: number
  puzzleId: string
  elapsed: number
  difficulty: Difficulty
  variant: GameVariant
  dailyAnchor: string
  phase: 'celebrating' | 'ready'
}
const variantTitles: Record<GameVariant, string> = { classic: 'Classic', x: 'X Sudoku', killer: 'Killer Sudoku' }
const titles: Record<Difficulty, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', expert: 'Expert' }
const descriptions: Record<Difficulty, string> = {
  beginner: 'Build confidence with naked and hidden singles.',
  intermediate: 'Look for locked candidates and naked pairs.',
  advanced: 'Work with triples and X-Wing patterns.',
  expert: 'Explore wings, coloring and candidate chains.',
}

const coordinate = (cell: number) => `Row ${Math.floor(cell / 9) + 1}, column ${cell % 9 + 1}`
function initialTheme(): Theme {
  try { const value = localStorage.getItem('sudoku-theme'); return value === 'light' || value === 'dark' ? value : 'device' } catch { return 'device' }
}
function formatTime(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` }

export default function App() {
  const [today, setToday] = useState(() => new Date().toISOString().slice(0, 10))
  const [session] = useState(() => loadSession(today))
  const [variant,setVariant]=useState<GameVariant>(session.variant??'classic')
  const [loading,setLoading]=useState(true)
  const [generationError,setGenerationError]=useState('')
  const generation=useRef<AbortController|null>(null)
  const generationSerial=useRef(0)
  const generatedCache=useRef(new Map<string,Puzzle>())
  const [dailyDate, setDailyDate] = useState(session.dailyDate)
  const [page, setPage] = useState<Page>(session.mode)
  const [mode, setMode] = useState<'daily' | 'practice'>(session.mode)
  const [difficulty, setDifficulty] = useState<Difficulty>(session.difficulty)
  // Hidden until generation succeeds; never read or persist a placeholder game.
  const [puzzle, setPuzzle] = useState<Puzzle>(() => ({id:'loading',givens:Array(81).fill(0),solution:[],difficulty:session.difficulty,techniques:[]}))
  const [state, setState] = useState<GameState>(()=>createGame(puzzle))
  const stateRef = useRef(state); stateRef.current = state
  const [saveWarning, setSaveWarning] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [effects, setEffects] = useState(() => { try { return localStorage.getItem('sudoku-effects') !== 'off' } catch { return true } })
  const [showMistakes, setShowMistakes] = useState(() => { try { return localStorage.getItem('sudoku-show-mistakes') === 'on' } catch { return false } })
  const [mistakeEvent, setMistakeEvent] = useState<MistakeEvent | null>(null)
  const mistakeSerial = useRef(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [help, setHelp] = useState(false)
  const [restart, setRestart] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [reward, setReward] = useState({ units: [] as number[], count: 0, complete: false, serial: 0 })
  const [completion, setCompletion] = useState<Completion | null>(null)
  const completionSerial = useRef(0)
  const focusAfterLoad = useRef<number | null>(null)
  const [digitReward,setDigitReward]=useState<{digits:number[];serial:number}|null>(null)
  const digitSerial=useRef(0)
  useEffect(()=>{
    if(!digitReward)return
    const timer=window.setTimeout(()=>setDigitReward(current=>current?.serial===digitReward.serial?null:current),800)
    return ()=>window.clearTimeout(timer)
  },[digitReward])
  const practiceSeeds = useRef<Partial<Record<Difficulty, string>>>({...session.practiceSeeds})
  const variantPracticeSeeds=useRef(session.variantPracticeSeeds??{})
  useEffect(() => {
    if(loading||generationError)return
    saveSession({version:1,mode,difficulty,dailyDate,practiceSeeds:practiceSeeds.current,generator:'v3',variant,variantPracticeSeeds:variantPracticeSeeds.current})
  }, [mode,difficulty,dailyDate,puzzle.id,variant,loading,generationError])
  useEffect(()=>{
    void load(session.mode,session.difficulty,false,session.dailyDate,session.variant??'classic')
    return ()=>generation.current?.abort()
  },[])
  const complete = !loading&&!generationError&&state.values.every((value, index) => value === puzzle.solution[index])
  const digitCounts=Array.from({length:10},()=>0)
  state.values.forEach(value=>{if(value)digitCounts[value]++})
  const mistakes = showMistakes ? state.values.flatMap((value, cell) => !puzzle.givens[cell] && value && value !== puzzle.solution[cell] ? [cell] : []) : []
  const selectedDescription = `${coordinate(state.selected)}. ${puzzle.givens[state.selected] ? `Given ${state.values[state.selected]}. Starting numbers stay fixed.` : state.values[state.selected] ? `Entry ${state.values[state.selected]}.` : state.notes[state.selected].length ? `Notes: ${state.notes[state.selected].join(', ')}.` : 'Empty.'}`

  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const resolvedTheme = theme === 'device' ? media.matches ? 'dark' : 'light' : theme
      document.documentElement.dataset.theme = resolvedTheme
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolvedTheme === 'dark' ? '#000000' : '#ffffff')
    }
    apply(); media.addEventListener('change', apply)
    try { localStorage.setItem('sudoku-theme', theme) } catch { setSaveWarning('Preferences could not be saved in this browser. You can keep playing.') }
    return () => media.removeEventListener('change', apply)
  }, [theme])
  useEffect(() => {
    if(loading||generationError)return
    const success = saveGame(state)
    if (!success) setSaveWarning('Progress could not be saved in this browser. You can keep playing, but this session may be lost when you leave.')
  }, [state,loading,generationError])
  useEffect(() => {
    const timer = window.setInterval(() => {
      setToday(new Date().toISOString().slice(0, 10))
      if (page !== 'learn' && !loading && !generationError && document.visibilityState === 'visible') {
        setState(previous => reduceGame(previous, { type: 'tick' }, puzzle))
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [page, puzzle,loading,generationError])

  useEffect(() => {
    if (loading || focusAfterLoad.current !== generationSerial.current) return
    focusAfterLoad.current = null
    const target = document.querySelector<HTMLElement>('#main [role="gridcell"][tabindex="0"]') ?? document.getElementById('main')
    target?.focus()
  }, [loading, generationError, puzzle.id])

  function cancelCompletion() {
    setCompletion(null)
    setReward(previous => previous.complete ? { units: [], count: previous.count, complete: false, serial: 0 } : previous)
  }
  function readyCompletion(token: number, puzzleId: string) {
    setCompletion(current => current?.token === token && current.puzzleId === puzzleId && current.phase === 'celebrating' ? { ...current, phase: 'ready' } : current)
  }

  function commit(previous:GameState,next:GameState) {
    stateRef.current=next;setState(next)
    const units=next.rewarded.filter(unit=>!previous.rewarded.includes(unit))
    const digits=next.rewardedDigits.filter(digit=>!previous.rewardedDigits.includes(digit))
    const finished=next.values.every((value,index)=>value===puzzle.solution[index])
    const firstCompletion=finished&&!previous.completed&&next.completed
    if (!finished) cancelCompletion()
    if(digits.length&&effects)setDigitReward({digits,serial:++digitSerial.current})
    if (firstCompletion) {
      setCompletion({ token: ++completionSerial.current, puzzleId: puzzle.id, elapsed: next.elapsed, difficulty: puzzle.difficulty, variant, dailyAnchor: mode === 'daily' ? dailyDate : today, phase: effects ? 'celebrating' : 'ready' })
    }
    if(units.length||firstCompletion){
      setReward(old=>({units:units.length?units:Array.from({length:27},(_,unit)=>unit),count:next.rewarded.length,complete:firstCompletion,serial:old.serial+1}))
      setAnnouncement(firstCompletion?'Puzzle complete.':`${units.length===1?'One unit':`${units.length} units`} complete.`)
    }
    return units.length>0||firstCompletion
  }
  function dispatch(action: GameAction) {
    if(loading||generationError)return
    const previous = stateRef.current
    if (action.type === 'undo' || action.type === 'restart') cancelCompletion()
    setDigitReward(null)
    const next = reduceGame(previous, action, puzzle)
    const cell = previous.selected
    const inputNoteMode = action.type === 'digit' ? action.noteMode ?? previous.noteMode : previous.noteMode
    const newMistake = action.type === 'digit' && showMistakes && !inputNoteMode && !puzzle.givens[cell] && next.values[cell] !== previous.values[cell] && next.values[cell] !== 0 && next.values[cell] !== puzzle.solution[cell]
    setMistakeEvent(newMistake ? { cell, serial: ++mistakeSerial.current } : null)
    const earned=commit(previous,next)
    if (action.type === 'select') return
    if(action.type==='undo'||action.type==='redo')setAnnouncement(action.type==='undo'?'Move undone. Keep working.':'Move restored.')
    if (action.type === 'restart') { setReward({ units: [], count: 0, complete: false, serial: 0 }); setAnnouncement('Entries and notes cleared.'); return }
    if (!earned && action.type === 'digit') {
      const value = next.values[next.selected]
      setAnnouncement(inputNoteMode ? 'Notes updated.' : puzzle.givens[next.selected] ? 'This starting number cannot be changed.' : showMistakes && value && value !== puzzle.solution[next.selected] ? `${value} is incorrect.` : 'Entry updated.')
    }
  }
  function applyHint(deduction: VariantDeduction) {
    setMistakeEvent(null)
    let next = stateRef.current
    const noteMode = next.noteMode
    for (const placement of deduction.placements) {
      next = reduceGame({ ...next, noteMode: false }, { type: 'select', cell: placement.cell }, puzzle)
      next = reduceGame(next, { type: 'digit', digit: placement.digit }, puzzle)
    }
    next = { ...next, noteMode }
    const earned=commit(stateRef.current,next)
    if(!earned)setAnnouncement(deduction.placements.length ? 'Explained placement applied. You can undo it.' : 'Logical eliminations recorded for the next hint. Manual notes were not changed.')
  }
  async function load(nextMode: 'daily' | 'practice', nextDifficulty = difficulty, fresh = false, date = dailyDate,nextVariant=variant, focusPuzzle=false) {
    cancelCompletion()
    setDigitReward(null)
    setMistakeEvent(null)
    const level=availableDifficulties(nextVariant).includes(nextDifficulty)?nextDifficulty:'beginner'
    const seeds=nextVariant==='classic'?practiceSeeds.current:(variantPracticeSeeds.current[nextVariant]??={})
    if(nextMode==='practice'&&(!seeds[level]||fresh))seeds[level]=crypto.randomUUID()
    generation.current?.abort()
    const controller=new AbortController();generation.current=controller
    const serial=++generationSerial.current
    focusAfterLoad.current = focusPuzzle ? serial : null
    setLoading(true);setGenerationError('')
    setDifficulty(level);setMode(nextMode);setPage(nextMode);setVariant(nextVariant);setDailyDate(date)
    let nextPuzzle:Puzzle
    try{
      const request=nextMode==='daily'?generatedDailyRequest(date,nextVariant,level):generatedPracticeRequest(seeds[level]!,nextVariant,level)
      nextPuzzle=generatedCache.current.get(request.id)??await requestGeneratedPuzzle(request,controller.signal)
      if(controller.signal.aborted||serial!==generationSerial.current)return
      generatedCache.current.set(request.id,nextPuzzle)
    }catch(error){
      if(controller.signal.aborted||serial!==generationSerial.current)return
      setGenerationError(error instanceof Error?error.message:'Puzzle generation failed. Try again.');setLoading(false);return
    }
    const loaded = readGame(nextPuzzle)
    setPuzzle(nextPuzzle); setState(loaded.state); stateRef.current = loaded.state
    setSaveWarning(loaded.warning);setLoading(false)
    setReward({ units: [], count: loaded.state.rewarded.length, complete: false, serial: 0 })
    setAnnouncement('')
  }
  function navigate(next: Page) {
    cancelCompletion()
    setDigitReward(null)
    setMistakeEvent(null)
    if (next === 'learn') { setReward(previous => ({ ...previous, units: [], complete: false, serial: 0 })); setPage(next); return }
    if (next === mode) setPage(next)
    else load(next)
  }
  function handleBoardKey(event: KeyboardEvent<HTMLDivElement>) {
    if (!/^[1-9]$/.test(event.key)) setMistakeEvent(null)
    if (event.altKey) return
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault(); dispatch({ type: event.shiftKey ? 'redo' : 'undo' }); return
    }
    if (event.metaKey || event.ctrlKey) return
    if (/^[1-9]$/.test(event.key)) { event.preventDefault(); dispatch({ type: 'digit', digit: Number(event.key) }) }
    else if (event.key.toLowerCase() === 'n') { event.preventDefault(); dispatch({ type: 'toggle-notes' }) }
    else if (event.key === 'Backspace' || event.key === 'Delete') { event.preventDefault(); dispatch({ type: 'erase' }) }
  }
  function changeEffects(next: boolean) {
    setDigitReward(null)
    setEffects(next)
    setReward({ units: [], count: state.rewarded.length, complete: false, serial: 0 })
    if (!next) setCompletion(current => current?.phase === 'celebrating' ? { ...current, phase: 'ready' } : current)
    try { localStorage.setItem('sudoku-effects', next ? 'on' : 'off') } catch { setSaveWarning('Effects preference could not be saved in this browser.') }
  }
  function changeShowMistakes(next: boolean) {
    setMistakeEvent(null)
    setAnnouncement('')
    setShowMistakes(next)
    try { localStorage.setItem('sudoku-show-mistakes', next ? 'on' : 'off') } catch { setSaveWarning('Preferences could not be saved in this browser. You can keep playing.') }
  }
  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to puzzle</a>
    <header className="site-header">
      <a className="wordmark" href="#main" onClick={() => navigate('daily')} aria-label="Sudoku home"><svg viewBox="0 0 27 27" width="27" height="27" fill="none" aria-hidden="true"><path d="M1 1h25v25H1zM9.3 1v25M17.7 1v25M1 9.3h25M1 17.7h25" stroke="currentColor" /><path d="M3 3h4v4H3zM20 11h4v5h-4zM11 20h5v4h-5z" fill="currentColor" /></svg><span>Sudoku</span></a>
      <nav className="main-nav" aria-label="Main navigation">{(['daily', 'practice', 'learn'] as const).map(item => <button type="button" key={item} aria-current={page === item ? 'page' : undefined} className={page === item ? 'active' : ''} onClick={() => navigate(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</nav>
      <div className="header-actions"><button type="button" className="settings-button" aria-label="Settings" title="Settings" onClick={() => setSettingsOpen(true)}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true"><path d="m9 3-.6 2.4-1.3.8-2.4-.7-3 5.2 1.8 1.7v1.5l-1.8 1.7 3 5.2 2.4-.7 1.3.8L9 23h6l.6-2.4 1.3-.8 2.4.7 3-5.2-1.8-1.7v-1.5l1.8-1.7-3-5.2-2.4.7-1.3-.8L15 3Z" transform="translate(1 0) scale(.92)"/><circle cx="12" cy="12" r="3"/></svg></button><button type="button" onClick={() => setHelp(true)}>Help</button></div>
    </header>
    <main id="main" tabIndex={-1}>
      {page === 'learn' ? <Learning onReturn={() => navigate(mode)} /> : <section className="play-section" aria-label={`${mode === 'daily' ? 'Daily' : 'Practice'} puzzle`}>
        <h1 className="sr-only">{mode === 'daily' ? 'Daily Sudoku' : 'Practice Sudoku'}</h1>
        <div className="puzzle-heading">{mode === 'daily' ? <Calendar date={dailyDate} today={today} onChange={date=>{void load('daily',difficulty,false,date)}} /> : <p className="puzzle-date">Practice</p>}<select className="mode-select" aria-label="Game mode" value={variant} onChange={event=>{void load(mode,difficulty,false,dailyDate,event.target.value as GameVariant)}}><option value="classic">Classic</option><option value="x">X Sudoku</option><option value="killer">Killer Sudoku</option></select><span className="timer" aria-label={`Elapsed ${formatTime(state.elapsed)}`}>{formatTime(state.elapsed)}</span></div>
        {mode === 'daily' && today !== dailyDate && <div className="notice"><button type="button" onClick={() => { setDailyDate(today); load('daily', difficulty, false, today) }}>Open today's puzzle</button></div>}
        <div className="difficulty-control" role="group" aria-label="Difficulty">{availableDifficulties(variant).map(level => <button type="button" aria-pressed={difficulty === level} title={descriptions[level]} className={difficulty === level ? 'active' : ''} key={level} onClick={() => load(mode, level)}>{titles[level]}</button>)}</div>
        {loading?<div className="generation-status" role="status">Generating puzzle…</div>:generationError?<div className="generation-status" role="status"><p>{generationError}</p><button type="button" onClick={()=>load(mode)}>Try again</button></div>:<div className="board-column" data-puzzle-id={puzzle.id}>
          <div className="board-wrap" data-progress={state.rewarded.length}><Board values={state.values} givens={puzzle.givens} notes={state.notes} selected={state.selected} onSelect={cell => dispatch({ type: 'select', cell })} onKeyDown={handleBoardKey} variant={puzzle.variant} cages={puzzle.cages} digitReward={effects?digitReward:null} mistakes={mistakes} mistakeEvent={mistakeEvent} onMistakeEnd={event => setMistakeEvent(current => current && current.cell === event.cell && current.serial === event.serial ? null : current)} label={mode === 'daily' ? 'Daily Sudoku' : 'Practice Sudoku'} />{effects && <RewardEffects {...reward} onComplete={completion?.phase === 'celebrating' ? () => readyCompletion(completion.token, completion.puzzleId) : undefined} />}</div>
          <p className="sr-only">{selectedDescription}</p>
          <p className={`game-status${complete ? ' complete-status' : ' sr-only'}`} role="status" aria-live="polite">{complete ? 'Puzzle complete.' : announcement}</p>
          <div className="number-pad" role="group" aria-label="Enter a number">{Array.from({ length: 9 }, (_, index) => <NumberButton key={`${puzzle.id}:${state.selected}:${index}`} digit={index + 1} noteMode={state.noteMode} disabled={digitCounts[index+1]>=9} onDigit={noteMode => dispatch({ type: 'digit', digit: index + 1, noteMode })} />)}<button type="button" className="erase-button" aria-label="Erase" title="Erase" onClick={() => dispatch({ type: 'erase' })}>⌫</button></div>
          <div className="game-toolbar" role="group" aria-label="Puzzle tools"><button type="button" disabled={!state.past.length} onClick={() => dispatch({ type: 'undo' })}>Undo</button><button type="button" disabled={!state.future.length} onClick={() => dispatch({ type: 'redo' })}>Redo</button><button type="button" className="notes-button" aria-pressed={state.noteMode} onClick={() => dispatch({ type: 'toggle-notes' })}><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true"><path d="m3 13 10-10 4 4L7 17H3Zm8-8 4 4M3 13l4 4"/></svg>Notes</button></div>
          <div className="play-actions"><HintPanel key={puzzle.id} values={state.values} rules={{variant:puzzle.variant??'classic',...(puzzle.cages?{cages:puzzle.cages}:{})}} onApply={applyHint} onHint={deduction => { if (deduction) dispatch({ type: 'hint-used' }) }} /><button type="button" className="icon-button" aria-label="Restart puzzle" title="Restart puzzle" onClick={() => setRestart(true)}>↻</button>{mode === 'practice' && <button type="button" className="icon-button" aria-label="New practice puzzle" title="New practice puzzle" onClick={() => load('practice', difficulty, true)}>+</button>}</div>
        </div>}
      </section>}
      {saveWarning && <div className="notice" role="status"><p>{saveWarning}</p><button type="button" onClick={() => setSaveWarning(null)}>Dismiss</button></div>}
    </main>
    {completion?.phase === 'ready' && completion.puzzleId === puzzle.id && complete && page !== 'learn' && !settingsOpen && !help && !restart && <Dialog title="Puzzle complete" className="completion-dialog" onClose={cancelCompletion}>
      <p className="completion-details">{titles[completion.difficulty]} · {variantTitles[completion.variant]}</p>
      <p className="completion-result"><span>Time</span><strong className="completion-time">{formatTime(completion.elapsed)}</strong></p>
      <div className="completion-actions">
        <button type="button" className="primary" autoFocus onClick={() => { void load('practice', completion.difficulty, true, dailyDate, completion.variant, true) }}>New practice puzzle</button>
        <button type="button" disabled={completion.dailyAnchor <= ARCHIVE_START} onClick={() => { void load('daily', completion.difficulty, false, shiftArchiveDate(completion.dailyAnchor, -1, today), completion.variant, true) }}>Previous daily puzzle</button>
        <button type="button" onClick={cancelCompletion}>Close</button>
      </div>
    </Dialog>}
    {settingsOpen && <Dialog title="Settings" className="settings-dialog" onClose={() => setSettingsOpen(false)}>
      <button type="button" className="settings-close" autoFocus onClick={() => setSettingsOpen(false)}>Close</button>
      <div className="setting-row"><label htmlFor="settings-theme">Theme</label><select id="settings-theme" value={theme} onChange={event => setTheme(event.target.value as Theme)}><option value="device">Device</option><option value="light">Light</option><option value="dark">Dark</option></select></div>
      <label className="setting-row"><span>Completion effects</span><input type="checkbox" checked={effects} onChange={event => changeEffects(event.target.checked)} /></label>
      <label className="setting-row"><span>Show mistakes</span><input type="checkbox" checked={showMistakes} onChange={event => changeShowMistakes(event.target.checked)} /></label>
    </Dialog>}
    {help && <Dialog title="A few simple rules." className="help-dialog" onClose={() => setHelp(false)}><p>Fill each row, column and outlined 3 × 3 box with the numbers 1–9, once in each group. Starting numbers stay fixed.</p><h3>Keyboard & touch</h3><p>Select a cell, then choose a number. On the board: arrows move; 1–9 enter; N toggles notes; Backspace or Delete erases; ⌘/Ctrl+Z undoes; ⌘/Ctrl+Shift+Z redoes. Tab moves to the next control.</p><h3>Only on this device</h3><p>Progress and preferences are saved in this browser. They do not sync. Clearing site data or private browsing may remove them. The daily puzzle changes at 00:00 UTC; you can finish an older puzzle first.</p><button type="button" autoFocus onClick={() => setHelp(false)}>Back to the grid</button></Dialog>}
    {restart && <Dialog title="Start this puzzle again?" onClose={() => setRestart(false)}><p>Clear your entries and notes for this puzzle? The starting numbers will stay.</p><div className="dialog-actions"><button type="button" autoFocus onClick={() => setRestart(false)}>Keep playing</button><button type="button" onClick={() => { dispatch({ type: 'restart' }); setRestart(false) }}>Clear entries and notes</button></div></Dialog>}
  </div>
}
