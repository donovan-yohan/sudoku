import {describe,it,expect,vi,afterEach} from 'vitest'
afterEach(()=>vi.unstubAllGlobals())
import {parseSession,loadSession,saveSession} from './session'
describe('browser session continuity',()=>{
 it('retains explicit daily date and practice seeds across reload',()=>{
  const data={version:1,mode:'practice',difficulty:'expert',dailyDate:'2026-10-20',practiceSeeds:{expert:'resume-me'}}
  expect(parseSession(JSON.stringify(data),'2026-10-21')).toEqual(data)
 })
 it.each(['null','{}','{"version":1,"mode":"oops"}','{',' '.repeat(9000)])('rejects invalid or oversized session',text=>{
  expect(parseSession(text,'2026-10-21')).toEqual({version:1,mode:'daily',difficulty:'beginner',dailyDate:'2026-10-21',practiceSeeds:{}})
 })
 it('resets an impossible date and rejects unsafe seed types',()=>{
  const data={version:1,mode:'practice',difficulty:'expert',dailyDate:'2026-02-30',practiceSeeds:{expert:9}}
  expect(parseSession(JSON.stringify(data),'2026-10-21').mode).toBe('daily')
 })
 it('uses safe in-memory fallback when local storage is unavailable',()=>{
  vi.stubGlobal('localStorage',{getItem:()=>{throw new Error('denied')},setItem:()=>{throw new Error('denied')}})
  expect(loadSession('2026-10-21').difficulty).toBe('beginner')
  expect(saveSession(parseSession(null,'2026-10-21'))).toBe(false)
 })
})
