import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import Board from './components/Board'
import Learning from './components/Learning'
import Dialog from './components/Dialog'
import HintPanel from './components/HintPanel'
import RewardEffects from './components/RewardEffects'
import { peers } from './engine'
import { readGame, reduceGame, saveGame } from './game'
import { loadSession, saveSession } from './session'
import { DIFFICULTIES, getDailyPuzzle, getPracticePuzzle } from './puzzles'
import type { Deduction, Difficulty, GameAction, GameState, Puzzle } from './types'

type Page = 'daily' | 'practice' | 'learn'
type Theme = 'device' | 'light' | 'dark'
const titles: Record<Difficulty, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', expert: 'Expert' }
const descriptions: Record<Difficulty, string> = {
  beginner: 'Build confidence with naked and hidden singles.',
  intermediate: 'Look for locked candidates and naked pairs.',
  advanced: 'Work with triples and X-Wing patterns.',
  expert: 'Connect candidates with Swordfish and XY-Wing.',
}
const coordinate = (cell: number) => `Row ${Math.floor(cell / 9) + 1}, column ${cell % 9 + 1}`
function initialTheme(): Theme {
  try { const value = localStorage.getItem('sudoku-theme'); return value === 'light' || value === 'dark' ? value : 'device' } catch { return 'device' }
}
function formatTime(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` }

export default function App() {
  const [today, setToday] = useState(() => new Date().toISOString().slice(0, 10))
  const [session] = useState(() => loadSession(today))
  const [dailyDate, setDailyDate] = useState(session.dailyDate)
  const [page, setPage] = useState<Page>(session.mode)
  const [mode, setMode] = useState<'daily' | 'practice'>(session.mode)
  const [difficulty, setDifficulty] = useState<Difficulty>(session.difficulty)
  const [puzzle, setPuzzle] = useState<Puzzle>(() => session.mode==='daily'?getDailyPuzzle(session.dailyDate,session.difficulty):getPracticePuzzle(session.difficulty,session.practiceSeeds[session.difficulty]!))
  const [restored] = useState(() => readGame(puzzle))
  const [state, setState] = useState<GameState>(restored.state)
  const stateRef = useRef(state); stateRef.current = state
  const [saveWarning, setSaveWarning] = useState<string | null>(restored.warning)
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [effects, setEffects] = useState(() => { try { return localStorage.getItem('sudoku-effects') !== 'off' } catch { return true } })
  const [help, setHelp] = useState(false)
  const [restart, setRestart] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [reward, setReward] = useState({ units: [] as number[], count: 0, complete: false, serial: 0 })
  const practiceSeeds = useRef<Partial<Record<Difficulty, string>>>({...session.practiceSeeds})
  useEffect(() => { saveSession({version:1,mode,difficulty,dailyDate,practiceSeeds:practiceSeeds.current}) }, [mode,difficulty,dailyDate,puzzle.id])
  const complete = state.values.every((value, index) => value === puzzle.solution[index])
  const conflicts = state.values.flatMap((value, index) => value && peers(index).some(peer => state.values[peer] === value) ? [index] : [])
  const selectedDescription = `${coordinate(state.selected)}. ${puzzle.givens[state.selected] ? `Given ${state.values[state.selected]}. Starting numbers stay fixed.` : state.values[state.selected] ? `Entry ${state.values[state.selected]}.` : state.notes[state.selected].length ? `Notes: ${state.notes[state.selected].join(', ')}.` : 'Empty.'}`

  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => { document.documentElement.dataset.theme = theme === 'device' ? media.matches ? 'dark' : 'light' : theme }
    apply(); media.addEventListener('change', apply)
    try { localStorage.setItem('sudoku-theme', theme) } catch { setSaveWarning('Preferences could not be saved in this browser. You can keep playing.') }
    return () => media.removeEventListener('change', apply)
  }, [theme])
  useEffect(() => {
    const success = saveGame(state)
    if (!success) setSaveWarning('Progress could not be saved in this browser. You can keep playing, but this session may be lost when you leave.')
  }, [state])
  useEffect(() => {
    const timer = window.setInterval(() => {
      setToday(new Date().toISOString().slice(0, 10))
      if (page !== 'learn' && document.visibilityState === 'visible') {
        setState(previous => reduceGame(previous, { type: 'tick' }, puzzle))
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [page, puzzle])

  function commit(previous:GameState,next:GameState) {
    stateRef.current=next;setState(next)
    const units=next.rewarded.filter(unit=>!previous.rewarded.includes(unit))
    if(units.length){
      const finished=next.values.every((value,index)=>value===puzzle.solution[index])
      setReward(old=>({units,count:next.rewarded.length,complete:finished,serial:old.serial+1}))
      setAnnouncement(finished?'Puzzle complete.':`${units.length===1?'One unit':`${units.length} units`} complete.`)
    }
    return units.length>0
  }
  function dispatch(action: GameAction) {
    const previous = stateRef.current
    const next = reduceGame(previous, action, puzzle)
    const earned=commit(previous,next)
    if (action.type === 'select') return
    if(action.type==='undo'||action.type==='redo')setAnnouncement(action.type==='undo'?'Move undone. Keep working.':'Move restored.')
    if (action.type === 'restart') { setReward({ units: [], count: 0, complete: false, serial: 0 }); setAnnouncement('Entries and notes cleared.'); return }
    if (!earned && action.type === 'digit') {
      const value = next.values[next.selected]
      setAnnouncement(value && peers(next.selected).some(peer => next.values[peer] === value) ? `${value} conflicts with another number in this row, column or box.` : next.noteMode ? 'Notes updated.' : puzzle.givens[next.selected] ? 'This starting number cannot be changed.' : 'Entry updated.')
    }
  }
  function applyHint(deduction: Deduction) {
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
  function load(nextMode: 'daily' | 'practice', nextDifficulty = difficulty, fresh = false, date = dailyDate) {
    if (nextMode === 'practice' && (!practiceSeeds.current[nextDifficulty] || fresh)) practiceSeeds.current[nextDifficulty] = `${Date.now()}-${Math.random()}`
    const nextPuzzle = nextMode === 'daily' ? getDailyPuzzle(date, nextDifficulty) : getPracticePuzzle(nextDifficulty, practiceSeeds.current[nextDifficulty]!)
    const loaded = readGame(nextPuzzle)
    setPuzzle(nextPuzzle); setState(loaded.state); stateRef.current = loaded.state
    setSaveWarning(loaded.warning); setDifficulty(nextDifficulty); setMode(nextMode); setPage(nextMode)
    setReward({ units: [], count: loaded.state.rewarded.length, complete: false, serial: 0 })
    setAnnouncement('')
  }
  function navigate(next: Page) {
    if (next === 'learn') { setReward(previous => ({ ...previous, units: [], complete: false, serial: 0 })); setPage(next); return }
    if (next === mode) setPage(next)
    else load(next)
  }
  function handleBoardKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey) return
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault(); dispatch({ type: event.shiftKey ? 'redo' : 'undo' }); return
    }
    if (event.metaKey || event.ctrlKey) return
    if (/^[1-9]$/.test(event.key)) { event.preventDefault(); dispatch({ type: 'digit', digit: Number(event.key) }) }
    else if (event.key.toLowerCase() === 'n') { event.preventDefault(); dispatch({ type: 'toggle-notes' }) }
    else if (event.key === 'Backspace' || event.key === 'Delete') { event.preventDefault(); dispatch({ type: 'erase' }) }
  }
  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to puzzle</a>
    <header className="site-header">
      <a className="wordmark" href="#main" onClick={() => navigate('daily')} aria-label="Sudoku home"><svg viewBox="0 0 27 27" width="27" height="27" fill="none" aria-hidden="true"><path d="M1 1h25v25H1zM9.3 1v25M17.7 1v25M1 9.3h25M1 17.7h25" stroke="currentColor" /><path d="M3 3h4v4H3zM20 11h4v5h-4zM11 20h5v4h-5z" fill="currentColor" /></svg><span>Sudoku</span></a>
      <nav className="main-nav" aria-label="Main navigation">{(['daily', 'practice', 'learn'] as const).map(item => <button type="button" key={item} aria-current={page === item ? 'page' : undefined} className={page === item ? 'active' : ''} onClick={() => navigate(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</nav>
      <div className="header-actions"><button type="button" className="theme-button" onClick={() => setTheme(theme === 'device' ? 'light' : theme === 'light' ? 'dark' : 'device')} aria-label={`Theme: ${theme === 'device' ? 'device setting' : theme}. Change theme`}>{theme === 'device' ? '◐ Device' : theme === 'light' ? '☼ Light' : '◑ Dark'}</button><button type="button" onClick={() => setHelp(true)}>Help</button></div>
    </header>
    <main id="main" tabIndex={-1}>
      {page === 'learn' ? <Learning onReturn={() => navigate(mode)} /> : <section className="play-section" aria-label={`${mode === 'daily' ? 'Daily' : 'Practice'} puzzle`}>
        <h1 className="sr-only">{mode === 'daily' ? 'Daily Sudoku' : 'Practice Sudoku'}</h1>
        <div className="puzzle-heading"><p className="puzzle-date">{mode === 'daily' ? <><time dateTime={dailyDate}>{new Date(`${dailyDate}T12:00:00Z`).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</time> · UTC</> : 'Practice'}</p><span className="timer" aria-label={`Elapsed ${formatTime(state.elapsed)}`}>{formatTime(state.elapsed)}</span></div>
        {mode === 'daily' && today !== dailyDate && <div className="notice"><button type="button" onClick={() => { setDailyDate(today); load('daily', difficulty, false, today) }}>Open today's puzzle</button></div>}
        <div className="difficulty-control" role="group" aria-label="Difficulty">{DIFFICULTIES.map(level => <button type="button" aria-pressed={difficulty === level} title={descriptions[level]} className={difficulty === level ? 'active' : ''} key={level} onClick={() => load(mode, level)}>{titles[level]}</button>)}</div>
        <div className="board-column">
          <div className="board-wrap" data-progress={state.rewarded.length}><Board values={state.values} givens={puzzle.givens} notes={state.notes} selected={state.selected} onSelect={cell => dispatch({ type: 'select', cell })} onKeyDown={handleBoardKey} conflicts={conflicts} label={mode === 'daily' ? 'Daily Sudoku' : 'Practice Sudoku'} />{effects && <RewardEffects {...reward} />}</div>
          <p className="sr-only">{selectedDescription}</p>
          <p className={`game-status${complete ? ' complete-status' : ' sr-only'}`} role="status" aria-live="polite">{complete ? 'Puzzle complete.' : announcement}</p>
          <div className="number-pad" role="group" aria-label="Enter a number">{Array.from({ length: 9 }, (_, index) => <button type="button" key={index} aria-label={`${state.noteMode ? 'Toggle note' : 'Enter'} ${index + 1}`} onClick={() => dispatch({ type: 'digit', digit: index + 1 })}>{index + 1}</button>)}<button type="button" className="erase-button" aria-label="Erase" title="Erase" onClick={() => dispatch({ type: 'erase' })}>⌫</button></div>
          <div className="game-toolbar" role="group" aria-label="Puzzle tools"><button type="button" disabled={!state.past.length} onClick={() => dispatch({ type: 'undo' })}>Undo</button><button type="button" disabled={!state.future.length} onClick={() => dispatch({ type: 'redo' })}>Redo</button><button type="button" aria-pressed={state.noteMode} onClick={() => dispatch({ type: 'toggle-notes' })}>{state.noteMode ? 'Notes on' : 'Notes off'}</button><button type="button" onClick={() => dispatch({ type: 'auto-notes' })}>Auto-notes</button></div>
          <div className="play-actions"><HintPanel key={puzzle.id} values={state.values} onApply={applyHint} onHint={deduction => { if (deduction) dispatch({ type: 'hint-used' }) }} /><button type="button" className="icon-button" aria-label="Restart puzzle" title="Restart puzzle" onClick={() => setRestart(true)}>↻</button>{mode === 'practice' && <button type="button" className="icon-button" aria-label="New practice puzzle" title="New practice puzzle" onClick={() => load('practice', difficulty, true)}>+</button>}</div>
        </div>
      </section>}
      {saveWarning && <div className="notice" role="status"><p>{saveWarning}</p><button type="button" onClick={() => setSaveWarning(null)}>Dismiss</button></div>}
    </main>
    {help && <Dialog title="A few simple rules." className="help-dialog" onClose={() => setHelp(false)}><p>Fill each row, column and outlined 3 × 3 box with the numbers 1–9, once in each group. Starting numbers stay fixed.</p><h3>Keyboard & touch</h3><p>Select a cell, then choose a number. On the board: arrows move; 1–9 enter; N toggles notes; Backspace or Delete erases; ⌘/Ctrl+Z undoes; ⌘/Ctrl+Shift+Z redoes. Tab moves to the next control.</p><h3>Only on this device</h3><p>Progress and preferences are saved in this browser. They do not sync. Clearing site data or private browsing may remove them. The daily puzzle changes at 00:00 UTC; you can finish an older puzzle first.</p><h3>Motion preferences</h3><p>Completion effects are optional and always respect your device's reduced-motion setting. Sound is off.</p><button type="button" aria-pressed={effects} onClick={() => { const next = !effects; setEffects(next); setReward({ units: [], count: state.rewarded.length, complete: false, serial: 0 }); try { localStorage.setItem('sudoku-effects', next ? 'on' : 'off') } catch { setSaveWarning('Effects preference could not be saved in this browser.') } }}>{effects ? 'Effects on' : 'Effects off'}</button><button type="button" autoFocus onClick={() => setHelp(false)}>Back to the grid</button></Dialog>}
    {restart && <Dialog title="Start this puzzle again?" onClose={() => setRestart(false)}><p>Clear your entries and notes for this puzzle? The starting numbers will stay.</p><div className="dialog-actions"><button type="button" autoFocus onClick={() => setRestart(false)}>Keep playing</button><button type="button" onClick={() => { dispatch({ type: 'restart' }); setRestart(false) }}>Clear entries and notes</button></div></Dialog>}
  </div>
}
