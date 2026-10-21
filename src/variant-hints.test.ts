import {describe,expect,it} from 'vitest'
import {PRACTICAL_VARIANT_LESSONS} from './practical-variant-lessons'
import {requestVariantHint} from './variant-hints'
import {solveVariant} from './variant-engine'

describe('variant hint boundary',()=>{
 it('uses diagonal constraints instead of treating X as classic',()=>{
  const scenario=PRACTICAL_VARIANT_LESSONS.find(lesson=>lesson.id==='diagonal-single')!.scenarios[0]
  const result=requestVariantHint(scenario.board,{variant:'x'})
  expect(result.deduction).not.toBeNull()
  const step=result.deduction!
  const solution=solveVariant(scenario.board,{variant:'x'}).first!
  for(const action of step.placements)expect(action.digit).toBe(solution[action.cell])
  expect(result.message).toBe('')
 })
 it('uses Killer sums and never the player’s pencil marks as proof',()=>{
  const scenario=PRACTICAL_VARIANT_LESSONS.find(lesson=>lesson.id==='cage-remainder')!.scenarios[0]
  const rules={variant:'killer' as const,cages:scenario.cages}
  const result=requestVariantHint(scenario.board,rules)
  expect(result.deduction).not.toBeNull()
  const solution=solveVariant(scenario.board,rules).first!
  for(const action of result.deduction!.placements)expect(action.digit).toBe(solution[action.cell])
  expect(result.logical).toHaveLength(81)
 })
 it('rejects an X-only conflict before proposing a deduction',()=>{
  const values=Array(81).fill(0);values[0]=1;values[40]=1
  const result=requestVariantHint(values,{variant:'x'})
  expect(result.deduction).toBeNull()
  expect(result.message).toBe('Check the conflicting entries first.')
 })
 it('rejects a wrong cage sum even if ordinary units do not conflict',()=>{
  const scenario=PRACTICAL_VARIANT_LESSONS.find(lesson=>lesson.id==='cage-remainder')!.scenarios[0]
  const values=solveVariant(scenario.board,{variant:'killer',cages:scenario.cages}).first!;values[0]=0
  const cages=scenario.cages!.map(cage=>({...cage,cells:[...cage.cells]}))
  cages.find(cage=>cage.cells.includes(0))!.sum++
  const result=requestVariantHint(values,{variant:'killer',cages})
  expect(result.deduction).toBeNull()
  expect(result.message).not.toBe('')
 })
})
