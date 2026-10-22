import {describe,it,expect,vi,afterEach} from 'vitest'
import {createElement} from 'react'
import {renderToString} from 'react-dom/server'
import App from './App'
afterEach(()=>vi.unstubAllGlobals())
import {parseSession,loadSession,saveSession} from './session'
import type {Session} from './session'
describe('browser session continuity',()=>{
 it('starts behind loading without probing any puzzle save or publishing completed placeholder play',()=>{
  const getItem=vi.fn((key:string)=>key==='sudoku-theme'?'dark':key==='sudoku-effects'?'off':null)
  const setItem=vi.fn()
  vi.stubGlobal('localStorage',{getItem,setItem})
  const html=renderToString(createElement(App))
  expect(getItem.mock.calls.map(([key])=>key)).toStrictEqual(['sudoku-session-v2','sudoku-theme','sudoku-effects','sudoku-show-mistakes'])
  expect(setItem).not.toHaveBeenCalled()
  expect(html).toContain('Generating puzzle…')
  expect(html).not.toContain('data-puzzle-id')
  expect(html).not.toContain('Puzzle complete.')
  expect(html).toContain('0:00')
 })
 it('retains explicit daily date and practice seeds across reload',()=>{
  const data={version:1,mode:'practice',difficulty:'expert',dailyDate:'2026-10-20',practiceSeeds:{expert:'resume-me'}}
  expect(parseSession(JSON.stringify(data),'2026-10-21')).toStrictEqual(data)
 })
 it.each(['null','{}','{"version":1,"mode":"oops"}','{',' '.repeat(9000)])('rejects invalid or oversized session',text=>{
  expect(parseSession(text,'2026-10-21')).toEqual({version:1,mode:'daily',difficulty:'beginner',dailyDate:'2026-10-21',practiceSeeds:{}})
 })
 it('resets an impossible date and rejects unsafe seed types',()=>{
  const data={version:1,mode:'practice',difficulty:'expert',dailyDate:'2026-02-30',practiceSeeds:{expert:9}}
  expect(parseSession(JSON.stringify(data),'2026-10-21').mode).toBe('daily')
 })
 it.each(['2025-12-31','2026-10-22','2026-02-30'])('rejects restored dates outside the daily archive: %s',dailyDate=>{
  const data={version:1,mode:'daily',difficulty:'expert',dailyDate,practiceSeeds:{}}
  expect(parseSession(JSON.stringify(data),'2026-10-21').dailyDate).toBe('2026-10-21')
 })
 it('preserves a current session without adding optional selection fields',()=>{
  const data={version:1,mode:'daily',difficulty:'advanced',dailyDate:'2026-01-01',practiceSeeds:{expert:'saved-classic'}}
  expect(parseSession(JSON.stringify(data),'2026-10-21')).toStrictEqual(data)
 })
 it.each(['classic','x','killer'])('preserves optional %s variant and generated identity',variant=>{
  const data={version:1,mode:'daily',difficulty:'expert',dailyDate:'2026-01-01',practiceSeeds:{},variant,generator:'v3'}
  expect(parseSession(JSON.stringify(data),'2026-10-21')).toStrictEqual(data)
 })
 it.each(['diagonal','constructor','__proto__','toString',null,{},[],1,true].map(value=>[value]))('rejects malformed or prototype variant values: %j',variant=>{
  const data={version:1,mode:'daily',difficulty:'expert',dailyDate:'2026-01-01',practiceSeeds:{},variant}
  expect(parseSession(JSON.stringify(data),'2026-10-21')).toStrictEqual(parseSession(null,'2026-10-21'))
 })
 it.each(['v1','v2','constructor','__proto__',null,{},[],2,true].map(value=>[value]))('rejects unsupported generator values: %j',generator=>{
  const data={version:1,mode:'daily',difficulty:'expert',dailyDate:'2026-01-01',practiceSeeds:{},generator}
  expect(parseSession(JSON.stringify(data),'2026-10-21')).toStrictEqual(parseSession(null,'2026-10-21'))
 })
 it.each(['x','killer'] as const)('restores %s practice from its own seed without a classic seed',variant=>{
  const data={version:1,mode:'practice',difficulty:'expert',dailyDate:'2026-01-01',practiceSeeds:{},variant,variantPracticeSeeds:{x:{expert:'x-practice'},killer:{expert:'killer-practice'}}}
  expect(parseSession(JSON.stringify(data),'2026-10-21')).toStrictEqual(data)
 })
 it.each(['x','killer'] as const)('never resumes %s practice using a classic or other variant seed',variant=>{
  const other=variant==='x'?'killer':'x'
  for(const variantPracticeSeeds of [undefined,{}, {[other]:{expert:'wrong-variant'}},{[variant]:{beginner:'wrong-level'}}]){
   const data={version:1,mode:'practice',difficulty:'expert',dailyDate:'2026-01-01',practiceSeeds:{expert:'classic-only'},variant,variantPracticeSeeds}
   expect(parseSession(JSON.stringify(data),'2026-10-21')).toStrictEqual(parseSession(null,'2026-10-21'))
  }
 })
 it.each([undefined,'classic'])('requires a classic seed for classic practice even with variant seeds: %s',variant=>{
  const data={version:1,mode:'practice',difficulty:'expert',dailyDate:'2026-01-01',practiceSeeds:{},variant,variantPracticeSeeds:{x:{expert:'x-only'},killer:{expert:'killer-only'}}}
  expect(parseSession(JSON.stringify(data),'2026-10-21')).toStrictEqual(parseSession(null,'2026-10-21'))
 })
 it('keeps all four difficulty seed slots separate without imposing engine capabilities',()=>{
  const data={version:1,mode:'daily',difficulty:'expert',dailyDate:'2026-01-01',practiceSeeds:{beginner:'classic-b',intermediate:'classic-i',advanced:'classic-a',expert:'classic-e'},variant:'killer',variantPracticeSeeds:{x:{beginner:'x-b',intermediate:'x-i',advanced:'x-a',expert:'x-e'},killer:{beginner:'killer-b',intermediate:'killer-i',advanced:'killer-a',expert:'killer-e'}}}
  expect(parseSession(JSON.stringify(data),'2026-10-21')).toStrictEqual(data)
 })
 it.each([null,[],1,'seed',{x:null},{x:[]},{x:'seed'},{killer:1},{classic:{}},{diagonal:{}},JSON.parse('{"__proto__":{}}'),{constructor:{}}].map(value=>[value]))('rejects malformed variant seed maps: %j',variantPracticeSeeds=>{
  const data={version:1,mode:'daily',difficulty:'expert',dailyDate:'2026-01-01',practiceSeeds:{},variantPracticeSeeds}
  expect(parseSession(JSON.stringify(data),'2026-10-21')).toStrictEqual(parseSession(null,'2026-10-21'))
 })
 it.each(['', 's'.repeat(121),null,3,true,{},[]].map(value=>[value]))('rejects unsafe seed values in classic and variant maps: %j',seed=>{
  for(const seeds of [{practiceSeeds:{expert:seed}},{practiceSeeds:{},variantPracticeSeeds:{x:{expert:seed}}},{practiceSeeds:{},variantPracticeSeeds:{killer:{expert:seed}}}]){
   const data={version:1,mode:'daily',difficulty:'expert',dailyDate:'2026-01-01',...seeds}
   expect(parseSession(JSON.stringify(data),'2026-10-21')).toStrictEqual(parseSession(null,'2026-10-21'))
  }
 })
 it.each(['constructor','__proto__','toString','impossible'])('rejects prototype or unknown keys in variant difficulty maps: %s',key=>{
  const data={version:1,mode:'daily',difficulty:'expert',dailyDate:'2026-01-01',practiceSeeds:{},variantPracticeSeeds:{x:{[key]:'unsafe'}}}
  expect(parseSession(JSON.stringify(data),'2026-10-21')).toStrictEqual(parseSession(null,'2026-10-21'))
 })
 it('preserves independently optional generated identity and empty variant maps',()=>{
  const base={version:1,mode:'daily',difficulty:'expert',dailyDate:'2026-01-01',practiceSeeds:{}}
  for(const extra of [{generator:'v3'},{variantPracticeSeeds:{}},{variantPracticeSeeds:{x:{},killer:{}}}]){
   const data={...base,...extra}
   expect(parseSession(JSON.stringify(data),'2026-10-21')).toStrictEqual(data)
  }
 })
 it('accepts the existing maximum seed length in every namespace',()=>{
  const data={version:1,mode:'practice',difficulty:'expert',dailyDate:'2026-10-21',practiceSeeds:{expert:'s'.repeat(120)},variant:'killer',variantPracticeSeeds:{x:{expert:'x'.repeat(120)},killer:{expert:'k'.repeat(120)}}}
  expect(parseSession(JSON.stringify(data),'2026-10-21')).toStrictEqual(data)
 })
 it.each(['classic','x','killer'] as const)('preserves archived date and %s identity across daily and practice storage reloads',variant=>{
  const storage=new Map<string,string>()
  vi.stubGlobal('localStorage',{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)})
  for(const mode of ['daily','practice'] as const){
   const data:Session={version:1,mode,difficulty:'expert',dailyDate:'2026-01-01',practiceSeeds:{expert:'classic-stable'},variant,generator:'v3',variantPracticeSeeds:{x:{expert:'x-stable'},killer:{expert:'killer-stable'}}}
   expect(saveSession(data)).toBe(true)
   expect([...storage.keys()]).toStrictEqual(['sudoku-session-v2'])
   expect(JSON.parse(storage.get('sudoku-session-v2')!)).toStrictEqual(data)
   expect(loadSession('2026-10-21')).toStrictEqual(data)
  }
 })
 it.each(['2025-12-31','2026-10-22','2026-02-30'])('enforces archive bounds for every variant and mode: %s',dailyDate=>{
  for(const variant of ['classic','x','killer'])for(const mode of ['daily','practice']){
   const data={version:1,mode,difficulty:'expert',dailyDate,practiceSeeds:{expert:'classic'},variant,generator:'v3',variantPracticeSeeds:{x:{expert:'x'},killer:{expert:'killer'}}}
   expect(parseSession(JSON.stringify(data),'2026-10-21')).toStrictEqual(parseSession(null,'2026-10-21'))
  }
 })
 it('ignores obsolete session records and saves and restores only the current namespace',()=>{
  const obsolete=JSON.stringify({version:1,mode:'practice',difficulty:'expert',dailyDate:'2026-01-01',practiceSeeds:{expert:'obsolete-seed'},generator:'v2'})
  const storage=new Map([['sudoku-session-v1',obsolete]])
  const getItem=vi.fn((key:string)=>storage.get(key)??null)
  vi.stubGlobal('localStorage',{getItem,setItem:(key:string,value:string)=>storage.set(key,value)})
  expect(loadSession('2026-10-21')).toStrictEqual(parseSession(null,'2026-10-21'))
  expect(getItem.mock.calls).toStrictEqual([['sudoku-session-v2']])
  const current:Session={version:1,mode:'practice',difficulty:'expert',dailyDate:'2026-01-15',practiceSeeds:{expert:'current-seed'}}
  expect(saveSession(current)).toBe(true)
  expect(JSON.parse(storage.get('sudoku-session-v2')!)).toStrictEqual(current)
  expect(loadSession('2026-10-21')).toStrictEqual(current)
  expect(storage.get('sudoku-session-v1')).toBe(obsolete)
  expect([...storage.keys()].sort()).toStrictEqual(['sudoku-session-v1','sudoku-session-v2'])
 })
 it('uses safe in-memory fallback when local storage is unavailable',()=>{
  vi.stubGlobal('localStorage',{getItem:()=>{throw new Error('denied')},setItem:()=>{throw new Error('denied')}})
  expect(loadSession('2026-10-21').difficulty).toBe('beginner')
  expect(saveSession(parseSession(null,'2026-10-21'))).toBe(false)
 })
})
