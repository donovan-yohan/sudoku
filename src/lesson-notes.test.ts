import {describe,it,expect} from 'vitest'
import {LESSONS} from './lessons'
import {lessonNotes} from './lesson-notes'

describe('lesson-specific candidate display',()=>{
 for(const lesson of LESSONS)for(const scenario of lesson.scenarios)it(`${scenario.id} shows only relevant notes without changing proof domains`,()=>{
  const original=JSON.stringify(scenario.candidates)
  const visible=lessonNotes(lesson.id,scenario)
  const relevant=new Set([...scenario.evidence,scenario.target])
  expect(visible).toHaveLength(81)
  visible.forEach((notes,cell)=>{
   expect(notes.every(digit=>scenario.candidates[cell].includes(digit))).toBe(true)
   if(!relevant.has(cell))expect(notes).toEqual([])
  })
  expect(visible[scenario.target]).toContain(scenario.digit)
  expect(visible.flat().length).toBeLessThan(120)
  expect(JSON.stringify(scenario.candidates)).toBe(original)
  if(['locked-candidates','x-wing','swordfish'].includes(lesson.id))expect(visible.flat().every(digit=>digit===scenario.digit)).toBe(true)
  if(['naked-pair','naked-triple','xy-wing'].includes(lesson.id))for(const cell of scenario.evidence)expect(visible[cell]).toEqual(scenario.candidates[cell])
 })
})
