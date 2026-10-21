import { useState } from 'react'
import Board from './Board'
import { LESSONS, evaluateLesson, validateScenario } from '../lessons'
import type { Difficulty, Lesson, LessonAction, Scenario } from '../types'

const PROGRESS_KEY = 'sudoku-lessons-v1'
const tiers: Difficulty[] = ['beginner', 'intermediate', 'advanced', 'expert']
const tierNames: Record<Difficulty, string> = { beginner: 'Foundations', intermediate: 'Intermediate', advanced: 'Advanced', expert: 'Expert' }
const coordinate = (cell: number) => `r${Math.floor(cell / 9) + 1}c${cell % 9 + 1}`

export function parseLessonProgress(text: string | null): string[] {
  if (!text) return []
  try {
    const data: unknown = JSON.parse(text)
    if (!data || typeof data !== 'object') return []
    const { version, passed } = data as { version?: unknown; passed?: unknown }
    if (version !== 1 || !Array.isArray(passed) || passed.length > 128 || !passed.every(value => typeof value === 'string')) return []
    const known = new Set(LESSONS.flatMap(lesson => lesson.scenarios.map(scenario => scenario.id)))
    return [...new Set<string>(passed)].filter(id => known.has(id))
  } catch { return [] }
}
function readProgress() {
  if (typeof window === 'undefined') return { passed: [] as string[], warning: '' }
  try { return { passed: parseLessonProgress(localStorage.getItem(PROGRESS_KEY)), warning: '' } }
  catch { return { passed: [] as string[], warning: 'Lesson progress cannot be saved in this browser. You can still use every lesson.' } }
}

export default function Learning({ onReturn }: { onReturn: () => void }) {
  const [initial] = useState(readProgress)
  const [passed, setPassed] = useState(initial.passed)
  const [warning, setWarning] = useState(initial.warning)
  const [active, setActive] = useState<Lesson | null>(null)
  const [example, setExample] = useState(0)
  function record(scenario: Scenario) {
    const next = [...new Set([...passed, scenario.id])]
    setPassed(next)
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify({ version: 1, passed: next })) }
    catch { setWarning('Lesson progress could not be saved. You can keep learning, but this session may be lost when you leave.') }
  }
  return <section className="learning-section" aria-label="Interactive lessons">
    <div className="learn-heading"><h1>Lessons</h1><button type="button" className="text-link" onClick={onReturn}>Return to puzzle <span aria-hidden="true">↗</span></button></div>
    {warning && <p className="notice" role="status">{warning}</p>}
    {active ? <>
      <button type="button" className="back-link" onClick={() => setActive(null)}>← All lessons</button>
      <article className="active-lesson"><div className="lesson-introduction"><p className="eyebrow">{tierNames[active.tier]} · Example {example + 1} of 2</p><h2>{active.title}</h2><h3>Before you begin</h3><ul>{active.prerequisites.map(prerequisite => <li key={prerequisite}>{prerequisite}</li>)}</ul><div className="lesson-rule"><h3>The rule</h3><p>{active.rule}</p></div><ol className="lesson-steps">{active.steps.map(step => <li key={step}>{step}</li>)}</ol></div>
        <LessonExercise key={active.scenarios[example].id} lesson={active} scenario={active.scenarios[example]} example={example} onPass={record} onNext={() => setExample(1)} onPrevious={() => setExample(0)} onFinish={() => setActive(null)} completed={active.scenarios.every(scenario => passed.includes(scenario.id))} />
      </article>
    </> : <>
      <div className="lesson-catalog">{tiers.map(tier => {
        const lessons = LESSONS.filter(lesson => lesson.tier === tier)
        if (!lessons.length) return null
        return <section className="lesson-tier" key={tier}><h2>{tierNames[tier]}</h2><ol className="lesson-list">{lessons.map(lesson => {
          const count = lesson.scenarios.filter(scenario => passed.includes(scenario.id)).length
          return <li className="lesson-item" key={lesson.id}><button type="button" className="lesson-link" onClick={() => { setActive(lesson); setExample(0) }}><span className="lesson-number" aria-hidden="true">{String(LESSONS.indexOf(lesson) + 1).padStart(2, '0')}</span><span className="lesson-description"><strong>{lesson.title}</strong><span>{lesson.summary}</span></span><span className="lesson-status">{count === 2 ? 'Completed' : count ? 'In progress' : 'Not started'} <span aria-hidden="true">↗</span></span></button></li>
        })}</ol></section>
      })}</div>
    </>}
  </section>
}

function LessonExercise({ lesson, scenario, example, onPass, onNext, onPrevious, onFinish, completed }: {
  lesson: Lesson; scenario: Scenario; example: number; onPass: (scenario: Scenario) => void; onNext: () => void; onPrevious: () => void; onFinish: () => void; completed: boolean
}) {
  const [cell, setCell] = useState<number | null>(null)
  const [digit, setDigit] = useState<number | null>(null)
  const [kind, setKind] = useState<LessonAction['kind']>('place')
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null)
  const [explained, setExplained] = useState(false)
  const [candidateFocus, setCandidateFocus] = useState<number | null>(null)
  const valid = validateScenario(lesson, scenario)
  const correct = feedback?.correct === true
  const values = [...scenario.board]
  const marks = scenario.candidates.map(candidates => [...candidates])
  if (correct) {
    if (scenario.kind === 'place') { values[scenario.target] = scenario.digit; marks[scenario.target] = [] }
    else marks[scenario.target] = marks[scenario.target].filter(value => value !== scenario.digit)
  }
  function reset() { setCell(null); setDigit(null); setKind('place'); setFeedback(null); setExplained(false) }
  function check() {
    if (cell === null || digit === null) { setFeedback({ correct: false, message: 'Select a cell and a number, then choose whether to place it or eliminate the candidate.' }); return }
    const result = evaluateLesson(scenario, { cell, digit, kind })
    setFeedback(result)
    if (result.correct) onPass(scenario)
  }
  if (!valid) return <section className="notice" role="status"><p>This example is unavailable.</p><button type="button" onClick={onFinish}>Back to lessons</button></section>
  return <section className="lesson-exercise" aria-label={`Example ${example + 1}`}>
    <div className="lesson-task"><p className="lesson-prompt">{scenario.prompt}</p><p className="diagram-caption">{scenario.caption}</p></div>
    <div className="candidate-view"><button type="button" aria-pressed={candidateFocus !== null} onClick={() => setCandidateFocus(candidateFocus === null ? 1 : null)}>{candidateFocus === null ? 'Focus on one candidate' : 'Show every candidate'}</button>{candidateFocus !== null && <><div className="game-toolbar" role="group" aria-label="Candidate visibility">{Array.from({ length: 9 }, (_, index) => <button type="button" aria-label={`View candidate ${index + 1}`} aria-pressed={candidateFocus === index + 1} key={index} onClick={() => setCandidateFocus(index + 1)}>{index + 1}</button>)}</div><p>Viewing candidate {candidateFocus}. Other candidates are hidden visually, not eliminated.</p></>}</div>
    <div className="lesson-workspace"><div className="lesson-board-column"><Board candidateFocus={candidateFocus} values={values} givens={scenario.board} notes={marks} selected={cell ?? scenario.board.findIndex(value => value === 0)} onSelect={value => { if (!correct) setCell(value) }} label={`${lesson.title} example ${example + 1}`} evidence={example === 0 ? scenario.evidence : []} candidates onKeyDown={event => { if (!correct && !event.metaKey && !event.ctrlKey && !event.altKey && /^[1-9]$/.test(event.key)) { event.preventDefault(); setDigit(Number(event.key)) } }} />{cell !== null && <p className="selection-readout">{`${coordinate(cell)}: ${values[cell] ? `contains ${values[cell]}` : `candidates ${marks[cell].join(', ') || 'none'}`}.`}</p>}</div>
      <div className="lesson-response">{cell !== null && <div className="candidate-readout" role="group" aria-label="Selected cell candidates"><h4>Selected cell candidates</h4><p>{values[cell] ? `${coordinate(cell)} contains ${values[cell]}.` : `${coordinate(cell)}: ${marks[cell].join(' · ')}.`}</p></div>}<fieldset className="action-kind" disabled={correct}><legend>Your deduction</legend><label><input type="radio" name={`kind-${scenario.id}`} value="place" checked={kind === 'place'} onChange={() => setKind('place')} /> Place a number</label><label><input type="radio" name={`kind-${scenario.id}`} value="eliminate" checked={kind === 'eliminate'} onChange={() => setKind('eliminate')} /> Eliminate a candidate</label></fieldset>
        <div className="number-pad lesson-digits" role="group" aria-label="Choose a number">{Array.from({ length: 9 }, (_, index) => <button type="button" aria-label={`Choose ${index + 1}`} aria-pressed={digit === index + 1} disabled={correct} onClick={() => setDigit(index + 1)} key={index}>{index + 1}</button>)}</div>
        {cell !== null && digit !== null && <p className="proposed-action">{`${kind === 'place' ? 'Place' : 'Remove candidate'} ${digit} ${kind === 'place' ? 'in' : 'from'} ${coordinate(cell)}.`}</p>}
        <button type="button" className="primary-button" onClick={check} disabled={correct}>Check reasoning</button>
        {feedback && <div className={`lesson-feedback ${feedback.correct ? 'correct' : 'retry'}`} role="status"><h4>{feedback.correct ? 'That follows from the candidates.' : 'Not yet.'}</h4><p>{feedback.message}</p>{!feedback.correct && <button type="button" onClick={() => { setFeedback(null); setExplained(false) }}>Try again</button>}</div>}
        {!correct && <button type="button" className="text-link" onClick={() => setExplained(!explained)}>{explained ? 'Hide explanation' : 'Show explanation'}</button>}
        {explained && <div className="lesson-proof"><h4>Why this follows</h4><p>{scenario.proof}</p></div>}
        <div className="lesson-actions"><button type="button" onClick={reset}>Reset example</button>{example === 1 && <button type="button" onClick={onPrevious}>Previous example</button>}{correct && (example === 0 ? <button type="button" className="primary-button" onClick={onNext}>Try example 2</button> : <button type="button" className="primary-button" onClick={onFinish}>Back to lessons</button>)}</div>
        {completed && <p className="lesson-complete" role="status">Lesson complete.</p>}
      </div>
    </div>
  </section>
}
