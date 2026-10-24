import { useRef, type CSSProperties, type KeyboardEvent } from 'react'
import type { Board as BoardValues } from '../types'
import CageOutlines from './CageOutlines'
import '../variants.css'

export interface MistakeEvent { cell: number; serial: number }

export interface BoardProps {
  values: BoardValues
  givens: BoardValues
  notes: number[][]
  visibleNotes?: number[][]
  selected: number
  onSelect: (cell: number) => void
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void
  label: string
  cellIdPrefix?: string
  evidence?: number[]
  conflicts?: number[]
  mistakes?: number[]
  mistakeEvent?: MistakeEvent | null
  onMistakeEnd?: (event: MistakeEvent) => void
  candidates?: boolean
  candidateFocus?: number | null
  variant?: 'classic'|'x'|'killer'
  cages?: {cells:number[];sum:number}[]
  digitReward?: {digits:number[];serial:number}|null
}

export default function Board({ values, givens, notes, visibleNotes=notes, selected, onSelect, onKeyDown, label, cellIdPrefix, evidence = [], conflicts = [], mistakes = [], mistakeEvent = null, onMistakeEnd, candidates = false, candidateFocus = null, variant='classic',cages=[],digitReward=null }: BoardProps) {
  const cells = useRef<(HTMLButtonElement | null)[]>([])
  const selectedRow=Math.floor(selected/9),selectedColumn=selected%9
  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    const row = Math.floor(selected / 9), column = selected % 9
    const targets: Record<string, number> = {
      ArrowLeft: row * 9 + (column + 8) % 9,
      ArrowRight: row * 9 + (column + 1) % 9,
      ArrowUp: ((row + 8) % 9) * 9 + column,
      ArrowDown: ((row + 1) % 9) * 9 + column,
      Home: event.ctrlKey ? 0 : row * 9,
      End: event.ctrlKey ? 80 : row * 9 + 8,
    }
    if (targets[event.key] !== undefined && !event.metaKey && !event.altKey) {
      event.preventDefault()
      onSelect(targets[event.key])
      cells.current[targets[event.key]]?.focus()
    } else onKeyDown?.(event)
  }
  return <div className={`sudoku-board${candidates ? ' lesson-board' : ''}`} role="grid" aria-label={label} aria-rowcount={9} aria-colcount={9} onKeyDown={handleKey}>
    {Array.from({ length: 9 }, (_, row) => <div role="row" className="board-row" key={row}>
      {Array.from({ length: 9 }, (_, column) => {
        const cell = row * 9 + column, value = values[cell]
        const visible=visibleNotes[cell]||[]
        const marks=candidates&&selected!==cell?visible:notes[cell]||[]
        const isGiven = Boolean(givens[cell]), conflict = conflicts.includes(cell)
        const mistake = mistakes.includes(cell)
        const shaking = mistake && mistakeEvent?.cell === cell ? mistakeEvent : null
        const celebrating=Boolean(value&&digitReward?.digits.includes(value))
        const digitOrder=celebrating?values.slice(0,cell).filter(digit=>digit===value).length:0
        const mainDiagonal=variant==='x'&&row===column
        const antiDiagonal=variant==='x'&&row+column===8
        const diagonal=mainDiagonal||antiDiagonal
        const cageIndex=cages.findIndex(cage=>cage.cells.includes(cell)),cage=cages[cageIndex]
        const peer = selectedRow === row || selectedColumn === column || (Math.floor(selectedRow / 3) === Math.floor(row / 3) && Math.floor(selectedColumn / 3) === Math.floor(column / 3))
          || (mainDiagonal && selectedRow === selectedColumn) || (antiDiagonal && selectedRow + selectedColumn === 8)
        const description = `Row ${row + 1}, column ${column + 1}, ${value ? `${isGiven ? 'given' : 'entry'} ${value}` : `empty${marks.length ? `, ${candidates ? 'candidates' : 'notes'} ${marks.join(', ')}` : ''}`}${mistake ? ', incorrect' : conflict ? ', conflict' : ''}${evidence.includes(cell) ? ', evidence' : ''}${diagonal?', diagonal':''}${cage?`, cage sum ${cage.sum}, ${cage.cells.length} cells`:''}`
        const classes = ['cell', isGiven && 'given', selected === cell && 'selected', peer && 'peer', value && value === values[selected] && 'matching', conflict && 'conflict', mistake && 'mistake', evidence.includes(cell) && 'evidence', column === 2 || column === 5 ? 'box-right' : '', row === 2 || row === 5 ? 'box-bottom' : ''].filter(Boolean).join(' ')
        return <button type="button" role="gridcell" id={cellIdPrefix?`${cellIdPrefix}-r${row+1}c${column+1}`:undefined} aria-rowindex={row + 1} aria-colindex={column + 1} aria-label={description} aria-selected={selected === cell} aria-readonly={isGiven} aria-invalid={mistake || conflict || undefined} tabIndex={selected === cell ? 0 : -1} className={`${classes}${diagonal?' diagonal':''}${cage?' caged':''}`} data-cell={cell} data-cage={cage?cageIndex:undefined} key={cell} ref={element => { cells.current[cell] = element }} onClick={() => onSelect(cell)} onFocus={cellIdPrefix?()=>onSelect(cell):undefined}>
          {diagonal&&<svg className="diagonal-marks" aria-hidden="true" focusable="false" viewBox="0 0 100 100" preserveAspectRatio="none">
            {mainDiagonal&&<line x1="0" y1="0" x2="100" y2="100" strokeWidth="1" vectorEffect="non-scaling-stroke"/>}
            {antiDiagonal&&<line x1="100" y1="0" x2="0" y2="100" strokeWidth="1" vectorEffect="non-scaling-stroke"/>}
          </svg>}
          {cage&&cell===Math.min(...cage.cells)&&<span className="cage-total" aria-hidden="true">{cage.sum}</span>}
          {value ? <span className={`cell-value${shaking ? ' mistake-shake' : ''}${celebrating?' digit-celebrate':''}`} style={celebrating?{'--digit-order':digitOrder} as CSSProperties:undefined} key={celebrating?`digit-${digitReward!.serial}`:shaking?.serial ?? 'value'} onAnimationEnd={() => { if (shaking) onMistakeEnd?.(shaking) }} aria-hidden="true">{value}</span> : visible.length > 0 ? <span className="cell-notes" aria-hidden="true">{Array.from({ length: 9 }, (_, digit) => <span key={digit}>{visible.includes(digit + 1) && (candidateFocus === null || candidateFocus === digit + 1) ? `${digit + 1} ` : ''}</span>)}</span> : null}
        </button>
      })}
    </div>)}
    {cages.length>0&&<CageOutlines cages={cages}/>}
  </div>
}
