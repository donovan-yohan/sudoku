import { useRef, useState } from 'react'
import { candidates, findDeduction, isValidBoard, solve } from '../engine'
import type { Board, Deduction } from '../types'

const coordinate = (cell: number) => `r${Math.floor(cell / 9) + 1}c${cell % 9 + 1}`
export default function HintPanel({ values, onApply, onHint }: { values: Board; onApply: (deduction: Deduction) => void; onHint: (deduction: Deduction | null) => void }) {
  const trigger = useRef<HTMLButtonElement>(null)
  const signature = values.join('')
  const [hintState, setHintState] = useState<{ signature: string; deduction: Deduction | null; logical: number[][]; message: string; applied: boolean } | null>(null)
  const current = hintState?.signature === signature ? hintState : null
  function request() {
    if (!isValidBoard(values) || !solve(values)) {
      setHintState({ signature, deduction: null, logical: [], message: 'Check the conflicting entries first.', applied: false }); onHint(null); return
    }
    const logical = current?.logical.length ? current.logical : candidates(values)
    const deduction = findDeduction(values, logical)
    setHintState({ signature, deduction, logical, message: deduction ? '' : 'No hint available for this position.', applied: false })
    onHint(deduction)
  }
  const [open,setOpen]=useState(false)
  function close() {
    setOpen(false)
    trigger.current?.focus()
  }
  function apply() {
    if (!current?.deduction || current.applied) return
    const deduction = current.deduction
    const logical = current.logical.map(marks => [...marks])
    deduction.eliminations.forEach(({ cell, digit }) => { logical[cell] = logical[cell].filter(candidate => candidate !== digit) })
    setHintState({ ...current, logical, applied: true })
    onApply(deduction)
    if(deduction.placements.length)close()
  }
  return <div className="hint-control">
    <button ref={trigger} type="button" className="icon-button hint-button" aria-label="Hint" title="Hint" aria-expanded={open&&Boolean(current)} onClick={()=>{if(open&&current)close();else{request();setOpen(true)}}}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="square" aria-hidden="true"><path d="M9 18h6M9 21h6M8 14c-2-1.6-3-3.5-3-5.5a7 7 0 0 1 14 0c0 2-1 3.9-3 5.5l-1 2H9l-1-2Z"/></svg>
    </button>
    {open&&current&&<section className="hint-result" aria-label="Hint details"><button type="button" className="icon-button hint-close" aria-label="Close hint" title="Close hint" onClick={close}>×</button>
      {current?.message&&<p role="status">{current.message}</p>}
      {current?.deduction&&<div className="hint-explanation" role="status"><p className="eyebrow">{current.deduction.technique.replaceAll('-', ' ')}</p><p>{current.deduction.explanation}</p>
        {current.deduction.eliminations.length>0&&<ul>{current.deduction.eliminations.map(({cell,digit})=><li key={`${cell}-${digit}`}>Remove {digit} from {coordinate(cell)}.</li>)}</ul>}
        <button type="button" className="primary-button" disabled={current.applied} onClick={apply}>{current.applied?'Applied':'Apply this step'}</button>
        {current.applied&&<button type="button" onClick={request}>Next hint</button>}
      </div>}
    </section>}
  </div>
}
