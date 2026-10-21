import { describe, it, expect } from 'vitest'
import { rewardStyle } from './reward'
describe('completion choreography',()=>{
 it('starts softly and rotates through multiple effects',()=>{
  expect(rewardStyle(1,false).chromatic).toBe(false)
  expect(new Set(Array.from({length:8},(_,i)=>rewardStyle(i+1,false).variant)).size).toBeGreaterThan(3)
 })
 it('grows into chromatic effects and a separate full-board finale',()=>{
  expect(rewardStyle(18,false).chromatic).toBe(true)
  expect(rewardStyle(27,true).variant).toBe('finale')
  expect(rewardStyle(27,true).duration).toBeGreaterThan(rewardStyle(1,false).duration)
 })
})
