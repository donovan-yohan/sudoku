import { describe, it, expect, vi, afterEach } from 'vitest'
import { createGame, reduceGame, completeUnits, readGame, saveGame } from './game'
import type { Puzzle } from './types'
const solution = Array.from({length:81},(_,i)=>(Math.floor(i/9)*3+Math.floor(Math.floor(i/9)/3)+i%9)%9+1)
const puzzle: Puzzle={id:'test',givens:solution.map((n,i)=>i===0||i===1?0:n),solution,difficulty:'beginner',techniques:['naked-single']}
afterEach(()=>vi.unstubAllGlobals())

describe('history, notes and rewards',()=>{
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
 it('locks givens and enters a selected editable cell',()=>{
  const game=createGame(puzzle)
  expect(reduceGame({...game,selected:2},{type:'digit',digit:9},puzzle).values[2]).toBe(solution[2])
  const next=reduceGame({...game,selected:0},{type:'digit',digit:1},puzzle)
  expect(next.values[0]).toBe(1)
  expect(next.past).toHaveLength(1)
 })
})
