import type { Board, GameAction, GameSnapshot, GameState, Puzzle } from './types'
import {variantPeers} from './variant-engine'

export function createGame(puzzle: Puzzle): GameState {
  return { version: 1, puzzleId: puzzle.id, values: [...puzzle.givens], notes: Array.from({length:81},()=>[]), selected: puzzle.givens.indexOf(0) < 0 ? 0 : puzzle.givens.indexOf(0), noteMode: false, past: [], future: [], rewarded: completeUnits(puzzle.givens,puzzle.solution), rewardedDigits: completeDigits(puzzle.givens,puzzle.solution), elapsed: 0, hintsUsed: 0 }
}
const snapshot=(s:GameSnapshot):GameSnapshot=>({values:[...s.values],notes:s.notes.map(n=>[...n])})
const unitCells=(u:number)=>Array.from({length:9},(_,n)=>u<9?u*9+n:u<18?n*9+u-9:Math.floor((u-18)/3)*27+((u-18)%3)*3+Math.floor(n/3)*9+n%3)
export function completeUnits(values:Board,solution:Board):number[] {
  return Array.from({length:27},(_,i)=>i).filter(i=>unitCells(i).every(cell=>values[cell]===solution[cell]))
}
export function completeDigits(values:Board,solution:Board):number[] {
  return Array.from({length:9},(_,i)=>i+1).filter(digit=>values.filter(value=>value===digit).length===9&&values.every((value,cell)=>value!==digit||solution[cell]===digit))
}

export function reduceGame(s:GameState,a:GameAction,puzzle:Puzzle):GameState {
  if(a.type==='select')return Number.isInteger(a.cell)&&a.cell>=0&&a.cell<81?{...s,selected:a.cell}:s
  if(a.type==='toggle-notes')return {...s,noteMode:!s.noteMode}
  if(a.type==='tick')return s.values.every((v,i)=>v===puzzle.solution[i])?s:{...s,elapsed:s.elapsed+1}
  if(a.type==='hint-used')return {...s,hintsUsed:s.hintsUsed+1}
  if(a.type==='restart')return createGame(puzzle)
  if(a.type==='undo'||a.type==='redo'){
    const from=a.type==='undo'?s.past:s.future
    const entry=from.at(-1)
    if(!entry)return s
    return {...s,...entry, past:a.type==='undo'?from.slice(0,-1):[...s.past,snapshot(s)].slice(-100), future:a.type==='redo'?from.slice(0,-1):[...s.future,snapshot(s)].slice(-100)}
  }
  const next=snapshot(s)
  const cell=s.selected
  if(puzzle.givens[cell])return s
  if(a.type==='erase'){next.values[cell]=0;next.notes[cell]=[]}
  else if(a.type==='digit'){
    if(!Number.isInteger(a.digit)||a.digit<1||a.digit>9)return s
    if(s.noteMode){
      if(next.values[cell])return s
      next.notes[cell]=next.notes[cell].includes(a.digit)?next.notes[cell].filter(d=>d!==a.digit):[...next.notes[cell],a.digit].sort()
    }else{
      next.values[cell]=a.digit;next.notes[cell]=[]
      const peers=new Set(variantPeers(cell,{variant:puzzle.variant??'classic',...(puzzle.cages?{cages:puzzle.cages}:{})}))
      next.notes=next.notes.map((notes,i)=>peers.has(i)?notes.filter(d=>d!==a.digit):notes)
    }
  }
  if(JSON.stringify(next)===JSON.stringify(snapshot(s)))return s
  return {...s,...next,past:[...s.past,snapshot(s)].slice(-100),future:[],rewarded:[...new Set([...s.rewarded,...completeUnits(next.values,puzzle.solution)])],rewardedDigits:[...new Set([...s.rewardedDigits,...completeDigits(next.values,puzzle.solution)])]}
}
const key=(puzzleId:string)=>`sudoku-game-v1:${puzzleId}`
function validSnapshot(raw:unknown,puzzle:Puzzle):raw is GameSnapshot {
  if(!raw||typeof raw!=='object')return false
  const o=raw as GameSnapshot
  return Array.isArray(o.values)&&o.values.length===81&&o.values.every((n,i)=>Number.isInteger(n)&&n>=0&&n<=9&&(!puzzle.givens[i]||n===puzzle.givens[i]))&&Array.isArray(o.notes)&&o.notes.length===81&&o.notes.every(n=>Array.isArray(n)&&n.length<=9&&new Set(n).size===n.length&&n.every(d=>Number.isInteger(d)&&d>=1&&d<=9))
}
export function readGame(puzzle:Puzzle):{state:GameState;warning:string|null} {
  const fresh=createGame(puzzle)
  try{
    const text=localStorage.getItem(key(puzzle.id))
    if(!text)return {state:fresh,warning:null}
    if(text.length>100000)throw new Error('Oversized save')
    const data=JSON.parse(text)
    if(!validSnapshot(data,puzzle))throw new Error('Invalid save')
    const raw=data as GameState
    if(raw.rewardedDigits!==undefined&&(!Array.isArray(raw.rewardedDigits)||raw.rewardedDigits.length>9||new Set(raw.rewardedDigits).size!==raw.rewardedDigits.length||!raw.rewardedDigits.every((n:unknown)=>typeof n==='number'&&Number.isInteger(n)&&n>=1&&n<=9)))throw new Error('Invalid digit rewards')
    if(raw.version!==1||raw.puzzleId!==puzzle.id||!Number.isInteger(raw.selected)||raw.selected<0||raw.selected>80||typeof raw.noteMode!=='boolean'||!Number.isInteger(raw.elapsed)||raw.elapsed<0||raw.elapsed>315360000||!Number.isInteger(raw.hintsUsed)||raw.hintsUsed<0||raw.hintsUsed>100000||!Array.isArray(raw.rewarded)||raw.rewarded.length>27||!raw.rewarded.every((n:unknown)=>typeof n==='number'&&Number.isInteger(n)&&n>=0&&n<27))throw new Error('Invalid save')
    return {state:{...fresh,...snapshot(raw),selected:raw.selected,noteMode:raw.noteMode,elapsed:raw.elapsed,hintsUsed:raw.hintsUsed,rewarded:[...new Set<number>([...raw.rewarded,...completeUnits(raw.values,puzzle.solution)])],rewardedDigits:[...new Set<number>([...(raw.rewardedDigits??[]),...completeDigits(raw.values,puzzle.solution)])]},warning:null}
  }catch{return {state:fresh,warning:'Saved progress could not be read. This puzzle started fresh; your other puzzles are unchanged.'}}
}
export function saveGame(state:GameState):boolean {
  try{localStorage.setItem(key(state.puzzleId),JSON.stringify({...state,past:[],future:[]}));return true}catch{return false}
}
