import {describe,expect,it} from 'vitest'
import {generatedDailyRequest,generatedPracticeRequest,generateRequestedPuzzle} from './generated-puzzles'

describe('generated puzzle identities',()=>{
 it('separates UTC date, variant, difficulty and daily/practice identities',()=>{
  const daily=generatedDailyRequest('2026-01-01','x','beginner')
  expect(daily.id).toBe('v2:daily:2026-01-01:x:beginner')
  expect(generatedPracticeRequest('2026-01-01','x','beginner').id).not.toBe(daily.id)
  expect(generatedDailyRequest('2026-01-01','classic','beginner').id).not.toBe(daily.id)
  expect(generatedDailyRequest('2026-01-01','x','intermediate').id).not.toBe(daily.id)
 })
 it.each(['2026-02-30','2026-2-03','not-a-date','2025-12-31'])('rejects malformed/out-of-archive date %s',date=>{
  expect(()=>generatedDailyRequest(date,'classic','beginner')).toThrow()
 })
 it('replays generated requests without sharing mutable boards',()=>{
  const request=generatedDailyRequest('2026-01-01','x','beginner')
  const first=generateRequestedPuzzle(request),again=generateRequestedPuzzle(request)
  expect(first).toEqual(again)
  expect(first.id).toBe(request.id)
  expect(first.variant).toBe('x')
  expect(first.givens.filter(Boolean)).toHaveLength(45)
  first.givens.fill(0)
  expect(again.givens.filter(Boolean)).toHaveLength(45)
 },30_000)
})
