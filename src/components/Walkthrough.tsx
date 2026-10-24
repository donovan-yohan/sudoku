import {useEffect,useRef,useState} from 'react'
import Board from './Board'
import CellReferences from './CellReferences'
import type {Deduction} from '../types'
import type {XWingPattern} from '../practical-lessons'
import {peers} from '../engine'
import '../walkthrough.css'

export interface WalkthroughScenario {
 id:string
 board:number[]
 candidates:number[][]
 evidence?:number[]
 steps:(Omit<Deduction,'technique'>&{technique:string;xWing?:XWingPattern})[]
 target:number
 digit:number
 variant?:'classic'|'x'|'killer'
 cages?:{cells:number[];sum:number}[]
}

function XWingPossibilities({pattern}:{pattern:XWingPattern}){
 const {digit,rows,columns}=pattern
 return <div className="x-wing-possibilities">{[0,1].map(possibility=><table key={possibility}>
  <caption>Possibility {possibility+1}</caption>
  <thead><tr><td/><th scope="col">Column {columns[0]+1}</th><th scope="col">Column {columns[1]+1}</th></tr></thead>
  <tbody>{rows.map((row,r)=><tr key={row}><th scope="row">Row {row+1}</th>{columns.map((column,c)=><td data-cell={row*9+column} key={column}>{(possibility===0?r===c:r!==c)?digit:''}</td>)}</tr>)}</tbody>
 </table>)}</div>
}

export default function Walkthrough({title,scenario,onComplete,cellIdPrefix}:{title:string;scenario:WalkthroughScenario;onComplete:()=>void;cellIdPrefix:string}){
 const [applied,setApplied]=useState(0)
 const [revealed,setRevealed]=useState(false)
 const [selected,setSelected]=useState<number|null>(null)
 const show=useRef<HTMLButtonElement>(null)
 const reset=useRef<HTMLButtonElement>(null)
 useEffect(()=>{
  if(applied===0)return
  if(applied===scenario.steps.length)reset.current?.focus()
  else show.current?.focus()
 },[applied,scenario.steps.length])
 const values=[...scenario.board]
 const notes=scenario.candidates.map(list=>[...list])
 for(const step of scenario.steps.slice(0,applied)){
  for(const {cell,digit} of step.placements){
   values[cell]=digit;notes[cell]=[]
   const affected=new Set(peers(cell))
   if(scenario.variant==='x')for(const diagonal of [Array.from({length:9},(_,i)=>i*10),Array.from({length:9},(_,i)=>8+i*8)])if(diagonal.includes(cell))diagonal.forEach(peer=>affected.add(peer))
   for(const cage of scenario.cages??[])if(cage.cells.includes(cell))cage.cells.forEach(peer=>affected.add(peer))
   for(const peer of affected)notes[peer]=notes[peer].filter(value=>value!==digit)
  }
  for(const {cell,digit} of step.eliminations)notes[cell]=notes[cell].filter(value=>value!==digit)
 }
 const step=scenario.steps[applied]
 const relevant=new Set([...(scenario.evidence??[]),...scenario.steps.flatMap(step=>[...step.cells,...step.placements.map(item=>item.cell),...step.eliminations.map(item=>item.cell)])])
 for(const {xWing} of scenario.steps){
  if(!xWing)continue
  for(const row of xWing.rows)for(let column=0;column<9;column++)relevant.add(row*9+column)
  for(const column of xWing.columns)for(let row=0;row<9;row++)relevant.add(row*9+column)
 }
 const visible=notes.map((list,cell)=>relevant.has(cell)?list:[])
 const placement=step?.placements[0]
 const applyLabel=placement?`Place ${placement.digit} at r${Math.floor(placement.cell/9)+1}c${placement.cell%9+1}`:'Apply step'
 const highlighted=step?[...new Set([...step.cells,...(applied===0?scenario.evidence??[]:scenario.steps[0].cells)])]:[]
 function apply(){
  const next=applied+1
  setApplied(next);setRevealed(false)
  if(next===scenario.steps.length)onComplete()

 }
 return <section className="walkthrough" aria-label={title}>
  <Board values={values} givens={scenario.board} notes={notes} visibleNotes={visible} selected={selected??step?.cells[0]??scenario.target} onSelect={setSelected} label={title} cellIdPrefix={cellIdPrefix} variant={scenario.variant} cages={scenario.cages} evidence={highlighted} focusDigit={revealed&&step?step.digit:null} candidates />
  <div className="walkthrough-controls">
   <button ref={show} type="button" disabled={!step||revealed} onClick={()=>setRevealed(true)}>Show next step</button>
   <button ref={reset} type="button" className="text-link" onClick={()=>{setApplied(0);setRevealed(false);setSelected(null)}}>Reset</button>
  </div>
  {revealed&&step&&<div className="lesson-step" role="status"><h3><CellReferences text={placement?applyLabel:step.technique.replaceAll('-',' ')} cellIdPrefix={cellIdPrefix}/></h3><div className="step-explanation">{step.explanation.split('\n\n').map((paragraph,index)=><p key={index}>{index>0?'\n\n':''}<CellReferences text={paragraph} cellIdPrefix={cellIdPrefix}/></p>)}</div>{step.xWing&&<XWingPossibilities pattern={step.xWing}/>}<button type="button" className="primary-button" onClick={apply}>{applyLabel}</button></div>}
  {!step&&<p className="walkthrough-result" role="status"><CellReferences text={`r${Math.floor(scenario.target/9)+1}c${scenario.target%9+1} = ${scenario.digit}`} cellIdPrefix={cellIdPrefix}/></p>}
 </section>
}
