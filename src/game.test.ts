import { describe, it, expect, vi, afterEach } from 'vitest'
import { createGame, reduceGame, completeUnits, completeDigits, readGame, saveGame } from './game'
import type { GameAction, Puzzle } from './types'
const solution = Array.from({length:81},(_,i)=>(Math.floor(i/9)*3+Math.floor(Math.floor(i/9)/3)+i%9)%9+1)
const puzzle: Puzzle={id:'test',givens:solution.map((n,i)=>i===0||i===1?0:n),solution,difficulty:'beginner',techniques:['naked-single']}
afterEach(()=>vi.unstubAllGlobals())

describe('digit completion rewards',()=>{
 it('acknowledges already complete digit sets when a game starts',()=>{
  expect(createGame(puzzle).rewardedDigits).toEqual([3,4,5,6,7,8,9])
 })
 it('acknowledges the ninth correct instance once, not just nine filled instances',()=>{
  let s=createGame(puzzle)
  const initial=[...s.rewardedDigits]
  s=reduceGame({...s,selected:1},{type:'digit',digit:1},puzzle)
  expect(s.values.filter(n=>n===1)).toHaveLength(9)
  expect(completeDigits(s.values,solution)).not.toContain(1)
  expect(s.rewardedDigits).toEqual(initial)
  s=reduceGame(s,{type:'erase'},puzzle)
  s=reduceGame({...s,selected:0},{type:'digit',digit:1},puzzle)
  expect(s.rewardedDigits.filter(d=>!initial.includes(d))).toEqual([1])
  expect(reduceGame(s,{type:'digit',digit:1},puzzle)).toBe(s)
  s=reduceGame(s,{type:'erase'},puzzle)
  s=reduceGame(s,{type:'digit',digit:1},puzzle)
  expect(s.rewardedDigits.filter(d=>d===1)).toEqual([1])
 })
 it('keeps digit acknowledgements outside undo and redo snapshots and re-entry',()=>{
  const earned=reduceGame(createGame(puzzle),{type:'digit',digit:1},puzzle)
  const back=reduceGame(earned,{type:'undo'},puzzle)
  expect(back.values[0]).toBe(0)
  expect(back.rewardedDigits).toEqual(earned.rewardedDigits)
  expect(reduceGame(back,{type:'redo'},puzzle).rewardedDigits).toEqual(earned.rewardedDigits)
  const reentered=reduceGame(back,{type:'digit',digit:1},puzzle)
  expect(reentered.rewardedDigits).toEqual(earned.rewardedDigits)
  expect(reentered.future).toEqual([])
  expect(earned.past[0]).not.toHaveProperty('rewardedDigits')
 })
 it('does not earn digit rewards from notes or other non-value actions',()=>{
  let s=createGame(puzzle)
  const initial=[...s.rewardedDigits]
  s=reduceGame(s,{type:'toggle-notes'},puzzle)
  s=reduceGame(s,{type:'digit',digit:1},puzzle)
  expect(s.notes[0]).toEqual([1])
  expect(s.values[0]).toBe(0)
  expect(s.rewardedDigits).toEqual(initial)
  for(const type of ['select','tick','hint-used','erase'] as const){
   s=reduceGame(s,type==='select'?{type,cell:1}:{type},puzzle)
   expect(s.rewardedDigits).toEqual(initial)
  }
 })
 it('resets earned digit rewards on restart but retains initially complete sets',()=>{
  const earned=reduceGame(createGame(puzzle),{type:'digit',digit:1},puzzle)
  expect(earned.rewardedDigits).toContain(1)
  const restarted=reduceGame(earned,{type:'restart'},puzzle)
  expect(restarted.rewardedDigits).toEqual([3,4,5,6,7,8,9])
  expect(restarted.values).toEqual(puzzle.givens)
 })
 it('acknowledges a set made correct by erasing an extra incorrect instance',()=>{
  let s=createGame(puzzle)
  s=reduceGame({...s,selected:1},{type:'digit',digit:1},puzzle)
  s=reduceGame({...s,selected:0},{type:'digit',digit:1},puzzle)
  expect(s.values.filter(n=>n===1)).toHaveLength(10)
  expect(s.rewardedDigits).not.toContain(1)
  s=reduceGame({...s,selected:1},{type:'erase'},puzzle)
  expect(s.rewardedDigits).toContain(1)
 })
 it('finds exactly nine correctly placed instances of each digit without mutating boards',()=>{
  const values=solution.map(n=>n===2||n===7?n:0)
  const before=[...values]
  expect(completeDigits(values,solution)).toEqual([2,7])
  expect(completeDigits(Array(81).fill(0),solution)).toEqual([])
  expect(completeDigits(solution,solution)).toEqual([1,2,3,4,5,6,7,8,9])
  expect(values).toEqual(before)
 })
})

describe('history, notes and rewards',()=>{
 it('prunes X diagonal notes and restores them exactly on undo',()=>{
  const xPuzzle={...puzzle,variant:'x' as const,givens:Array(81).fill(0)}
  const start=createGame(xPuzzle)
  start.notes[40]=[1,2];start.notes[12]=[1,2]
  const next=reduceGame({...start,selected:0},{type:'digit',digit:1},xPuzzle)
  expect(next.notes[40]).toEqual([2])
  expect(next.notes[12]).toEqual([1,2])
  expect(reduceGame(next,{type:'undo'},xPuzzle).notes).toEqual(start.notes)
 })
 it('prunes Killer cage peers outside ordinary units',()=>{
  const joined=[1,2,3,12]
  const cages=[{cells:joined,sum:joined.reduce((sum,cell)=>sum+solution[cell],0)},...solution.flatMap((digit,cell)=>joined.includes(cell)?[]:[{cells:[cell],sum:digit}])]
  const killer={...puzzle,variant:'killer' as const,cages,givens:Array(81).fill(0)}
  const start=createGame(killer)
  start.notes[12]=[2,7];start.notes[80]=[2,7]
  const next=reduceGame({...start,selected:1},{type:'digit',digit:2},killer)
  expect(next.notes[12]).toEqual([7])
  expect(next.notes[80]).toEqual([2,7])
 })
 it('restores pruned notes exactly through undo and redo',()=>{
  let s=createGame(puzzle)
  s={...s,selected:1,noteMode:true}
  s=reduceGame(s,{type:'digit',digit:1},puzzle)
  s=reduceGame({...s,selected:0,noteMode:false},{type:'digit',digit:1},puzzle)
  expect(s.notes[1]).toEqual([])
  const back=reduceGame(s,{type:'undo'},puzzle)
  expect(back.values[0]).toBe(0)
  expect(back.notes[1]).toEqual([1])
  expect(reduceGame(back,{type:'redo'},puzzle).notes[1]).toEqual([])
 })
 it('does not reward a full incorrect unit or replay through undo',()=>{
  let s={...createGame(puzzle),selected:0}
  s=reduceGame(s,{type:'digit',digit:2},puzzle)
  expect(completeUnits(s.values,solution)).not.toContain(9)
  s=reduceGame(s,{type:'digit',digit:1},puzzle)
  expect(s.rewarded).toContain(9)
  const rewards=[...s.rewarded]
  s=reduceGame(s,{type:'undo'},puzzle)
  s=reduceGame(s,{type:'redo'},puzzle)
  expect(s.rewarded).toEqual(rewards)
 })
 it('clears stale future on a new branch and bounds history',()=>{
  let s=createGame(puzzle)
  s=reduceGame(s,{type:'digit',digit:1},puzzle)
  s=reduceGame(s,{type:'undo'},puzzle)
  s=reduceGame(s,{type:'digit',digit:2},puzzle)
  expect(s.future).toEqual([])
  for(let n=0;n<110;n++)s=reduceGame(s,{type:'digit',digit:n%2+1},puzzle)
  expect(s.past.length).toBeLessThanOrEqual(100)
 })
})

describe('digit reward storage',()=>{
 it('persists acknowledgements after undo so reload and re-entry do not replay',()=>{
  const db=new Map<string,string>()
  vi.stubGlobal('localStorage',{getItem:(key:string)=>db.get(key)??null,setItem:(key:string,value:string)=>db.set(key,value)})
  const earned=reduceGame(createGame(puzzle),{type:'digit',digit:1},puzzle)
  const undone=reduceGame(earned,{type:'undo'},puzzle)
  expect(saveGame(undone)).toBe(true)
  const stored=JSON.parse(db.get(`sudoku-game-v1:${puzzle.id}`)!)
  expect(stored.rewardedDigits).toEqual(earned.rewardedDigits)
  expect(stored.past).toEqual([])
  expect(stored.future).toEqual([])
  const restored=readGame(puzzle)
  expect(restored.warning).toBeNull()
  expect(restored.state.values[0]).toBe(0)
  expect(restored.state.rewardedDigits).toEqual(earned.rewardedDigits)
  expect(reduceGame(restored.state,{type:'digit',digit:1},puzzle).rewardedDigits).toEqual(earned.rewardedDigits)
 })
 it('unions valid stored acknowledgements with currently complete sets',()=>{
  vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify({...createGame(puzzle),rewardedDigits:[1]})})
  const restored=readGame(puzzle)
  expect(restored.warning).toBeNull()
  expect(restored.state.rewardedDigits).toEqual([1,3,4,5,6,7,8,9])
 })
 it.each([[],[1,2,3,4,5,6,7,8,9]].map(rewardedDigits=>({rewardedDigits})))('accepts valid acknowledgement list $rewardedDigits',({rewardedDigits})=>{
  vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify({...createGame(puzzle),rewardedDigits})})
  const restored=readGame(puzzle)
  expect(restored.warning).toBeNull()
  expect(restored.state.rewardedDigits).toEqual([...new Set([...rewardedDigits,3,4,5,6,7,8,9])])
 })
 it.each([null,1,true,'1',{},[0],[10],[-1],[1.5],['1'],[null],[1,1],[1,2,3,4,5,6,7,8,9,1]].map(rewardedDigits=>({rewardedDigits})))('rejects malformed digit acknowledgement $rewardedDigits',({rewardedDigits})=>{
  vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify({...createGame(puzzle),rewardedDigits})})
  expect(readGame(puzzle).warning).not.toBeNull()
  expect(readGame(puzzle).state.values).toEqual(puzzle.givens)
 })
 it('migrates a legacy save by acknowledging already complete digit sets',()=>{
  const legacy:Record<string,unknown>={...createGame(puzzle),values:[...solution]}
  delete legacy.rewardedDigits
  vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify(legacy)})
  const restored=readGame(puzzle)
  expect(restored.warning).toBeNull()
  expect(restored.state.rewardedDigits).toEqual([1,2,3,4,5,6,7,8,9])
 })
})

describe('untrusted storage',()=>{
 it('restores valid progress but no stale history',()=>{
  const db=new Map<string,string>()
  vi.stubGlobal('localStorage',{getItem:(k:string)=>db.get(k)??null,setItem:(k:string,v:string)=>db.set(k,v)})
  const s=reduceGame(createGame(puzzle),{type:'digit',digit:1},puzzle)
  expect(saveGame(s)).toBe(true)
  expect(readGame(puzzle).state.values).toEqual(s.values)
  expect(readGame(puzzle).state.past).toEqual([])
 })
 it.each(['{','null','[]','{"version":999}'])('rejects corrupt save %s',text=>{
  vi.stubGlobal('localStorage',{getItem:()=>text})
  expect(readGame(puzzle).warning).not.toBeNull()
  expect(readGame(puzzle).state.values).toEqual(puzzle.givens)
 })
 it('rejects modified givens and duplicate note values',()=>{
  const raw=createGame(puzzle);raw.values[5]=1
  vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify(raw)})
  expect(readGame(puzzle).warning).not.toBeNull()
  raw.values[5]=puzzle.givens[5];raw.notes[0]=[2,2]
  expect(readGame(puzzle).warning).not.toBeNull()
 })
 it('rejects oversized saved records before parsing',()=>{
  const text=' '.repeat(100001)+JSON.stringify(createGame(puzzle))
  vi.stubGlobal('localStorage',{getItem:()=>text})
  expect(readGame(puzzle).warning).not.toBeNull()
 })
 it('keeps playing when storage is denied',()=>{
  vi.stubGlobal('localStorage',{getItem:()=>{throw new Error('denied')},setItem:()=>{throw new Error('quota')}})
  expect(readGame(puzzle).state.values).toEqual(puzzle.givens)
  expect(saveGame(createGame(puzzle))).toBe(false)
 })
})

describe('game input',()=>{
 it('ignores retired auto-notes input without changing manual notes',()=>{
  const game=createGame(puzzle)
  expect(reduceGame(game,{type:'auto-notes'} as unknown as GameAction,puzzle)).toBe(game)
 })
 it('locks givens and enters a selected editable cell',()=>{
  const game=createGame(puzzle)
  expect(reduceGame({...game,selected:2},{type:'digit',digit:9},puzzle).values[2]).toBe(solution[2])
  const next=reduceGame({...game,selected:0},{type:'digit',digit:1},puzzle)
  expect(next.values[0]).toBe(1)
  expect(next.past).toHaveLength(1)
 })
})
