import { useState } from 'react'
import { candidates, findDeduction, isValidBoard, solve } from '../engine'
import type { Board, Deduction } from '../types'

const coordinate = (cell: number) => `r${Math.floor(cell / 9) + 1}c${cell % 9 + 1}`
export default function HintPanel({ values, onApply, onHint }: { values: Board; onApply: (deduction: Deduction) => void; onHint: (deduction: Deduction | null) => void }) {
  const signature = values.join('')
  const [hintState, setHintState] = useState<{ signature: string; deduction: Deduction | null; logical: number[][]; message: string; applied: boolean } | null>(null)
  const current = hintState?.signature === signature ? hintState : null
  function request() {
    if (!isValidBoard(values) || !solve(values)) {
      setHintState({ signature, deduction: null, logical: [], message: 'The current entries conflict with the puzzle. Review your entries or undo a move before asking for a deduction.', applied: false }); onHint(null); return
    }
    const logical = current?.logical.length ? current.logical : candidates(values)
    const deduction = findDeduction(values, logical)
    setHintState({ signature, deduction, logical, message: deduction ? '' : 'No supported logical hint is available for this position. Review the board, undo a move or explore a lesson. No solution number has been revealed.', applied: false })
    onHint(deduction)
  }
  function apply() {
    if (!current?.deduction || current.applied) return
    const deduction = current.deduction
    const logical = current.logical.map(marks => [...marks])
    deduction.eliminations.forEach(({ cell, digit }) => { logical[cell] = logical[cell].filter(candidate => candidate !== digit) })
    setHintState({ ...current, logical, applied: true })
    onApply(deduction)
  }
  return <section className="hint-panel sidebar-section" aria-label="Logical assistance">
    <h3>A nudge, not an answer.</h3><p>Look for one logical step. You choose whether to apply it.</p>
    <button type="button" className="hint-button" onClick={request}>{current?.applied ? 'Find another hint' : 'Hint'}</button>
    {current?.message && <p role="status">{current.message}</p>}
    {current?.deduction && <div className="hint-explanation" role="status"><p className="eyebrow">{current.deduction.technique.replaceAll('-', ' ')}</p><p>{current.deduction.explanation}</p>
      <ul>{current.deduction.placements.map(({ cell, digit }) => <li key={`p${cell}${digit}`}>Place {digit} in {coordinate(cell)}.</li>)}{current.deduction.eliminations.map(({ cell, digit }) => <li key={`e${cell}${digit}`}>Remove candidate {digit} from {coordinate(cell)}.</li>)}</ul>
      {current.deduction.eliminations.length > 0 && <p>Applying this records a logical elimination for subsequent hints on this position. Your manual notes stay unchanged. Remove the listed notes yourself if you use them. A board edit starts a fresh hint analysis.</p>}
      <button type="button" className="primary-button" disabled={current.applied} onClick={apply}>{current.applied ? 'Step applied' : 'Apply this step'}</button>
    </div>}
  </section>
}
