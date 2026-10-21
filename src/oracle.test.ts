import { describe, it, expect } from 'vitest'
// Independent implementation deliberately shares no engine logic.
// @ts-expect-error standalone .mjs test oracle has no declaration file
import { enumerate } from '../scripts/independent-oracle.mjs'
import { CATALOG, DIFFICULTIES } from './puzzles'
import { LESSONS } from './lessons'
describe('independent constraint oracle',()=>{
 it('recognizes known complete, invalid and ambiguous controls',()=>{
  const valid=[...'534678912672195348198342567859761423426853791713924856961537284287419635345286179'].map(Number)
  expect(enumerate(valid).count).toBe(1)
  const invalid=[...valid];invalid[0]=6
  expect(enumerate(invalid).count).toBe(0)
  expect(enumerate(Array(81).fill(0)).count).toBe(2)
 })
 it('independently verifies uniqueness for every original catalog base',()=>{
  for(const tier of DIFFICULTIES)for(const text of CATALOG[tier])expect(enumerate([...text].map(Number)).count,`${tier}:${text}`).toBe(1)
 })
 it('each lesson has a consistent global witness and its claimed action is forced by supplied domains',()=>{
  for(const lesson of LESSONS)for(const s of lesson.scenarios){
   expect(enumerate(s.board,s.candidates,1).count,s.id+' needs a witness').toBe(1)
   const domains=s.candidates.map(ns=>[...ns])
   domains[s.target]=s.kind==='place'?domains[s.target].filter(d=>d!==s.digit):[s.digit]
   expect(enumerate(s.board,domains,1).count,s.id+' claim must be forced').toBe(0)
  }
 },30000)
})
