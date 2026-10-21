import {describe,expect,it} from 'vitest'
import {PRACTICAL_LESSONS} from './practical-lessons'

const lesson=PRACTICAL_LESSONS.find(lesson=>lesson.id==='x-wing')!
const coordinate=(cell:number)=>`r${Math.floor(cell/9)+1}c${cell%9+1}`
const cells=Array.from({length:81},(_,cell)=>cell)
const sorted=(values:number[])=>values.slice().sort((a,b)=>a-b)

describe('X-Wing teaching coverage',()=>{
 it('includes four genuine positions with row- and column-based applications',()=>{
  expect(lesson.scenarios).toHaveLength(4)
  const orientations=lesson.scenarios.map(scenario=>{
   const step=scenario.steps[0]
   const rows=[...new Set(step.cells.map(cell=>Math.floor(cell/9)))].sort((a,b)=>a-b)
   const columns=[...new Set(step.cells.map(cell=>cell%9))].sort((a,b)=>a-b)
   expect(rows).toHaveLength(2);expect(columns).toHaveLength(2)
   const rowBased=rows.every(row=>scenario.candidates.flatMap((notes,cell)=>Math.floor(cell/9)===row&&notes.includes(step.digit)?[cell]:[]).length===2)
   const columnBased=columns.every(column=>scenario.candidates.flatMap((notes,cell)=>cell%9===column&&notes.includes(step.digit)?[cell]:[]).length===2)
   expect(rowBased||columnBased).toBe(true)
   expect(step.eliminations).toContainEqual({cell:scenario.target,digit:step.digit})
   expect(scenario.steps.at(-1)?.placements).toContainEqual({cell:scenario.target,digit:scenario.digit})
   return rowBased?'rows':'columns'
  })
  expect(orientations.filter(value=>value==='rows')).toHaveLength(2)
  expect(orientations.filter(value=>value==='columns')).toHaveLength(2)
  expect(new Set(lesson.scenarios.map(scenario=>scenario.board.join(''))).size).toBe(4)
  expect(new Set(lesson.scenarios.map(scenario=>scenario.steps[0].digit)).size).toBeGreaterThan(1)
 })
 it('explains both possible diagonal pairs and the useful placement without fish jargon',()=>{
  for(const scenario of lesson.scenarios){
   const step=scenario.steps[0]
   const explanation=step.explanation
   for(const cell of step.cells)expect(explanation).toContain(coordinate(cell))
   expect(explanation).toMatch(/either way/i)
   expect(explanation).toMatch(/if .* then/i)
   expect(explanation).toContain(coordinate(scenario.target))
   expect(explanation).not.toMatch(/different cover|cover set|base set|confined/i)
  }
 })

 it('describes the complete rectangle and both local cases using full candidate domains',()=>{
  for(const scenario of lesson.scenarios){
   const [step,finish]=scenario.steps
   expect(step.xWing,scenario.id).toBeDefined()
   const pattern=step.xWing!
   expect(pattern.digit).toBe(step.digit)
   expect(pattern.rows).toEqual(sorted([...new Set(step.cells.map(cell=>Math.floor(cell/9)))]))
   expect(pattern.columns).toEqual(sorted([...new Set(step.cells.map(cell=>cell%9))]))
   expect(pattern.rows.every(row=>Number.isInteger(row)&&row>=0&&row<9)).toBe(true)
   expect(pattern.columns.every(column=>Number.isInteger(column)&&column>=0&&column<9)).toBe(true)
   const baseOf=(cell:number)=>pattern.orientation==='rows'?Math.floor(cell/9):cell%9
   const crossingOf=(cell:number)=>pattern.orientation==='rows'?cell%9:Math.floor(cell/9)
   const bases=pattern.orientation==='rows'?pattern.rows:pattern.columns
   const crossings=pattern.orientation==='rows'?pattern.columns:pattern.rows
   const rectangle=pattern.rows.flatMap(row=>pattern.columns.map(column=>row*9+column))
   expect(sorted(step.cells)).toEqual(sorted(rectangle))
   for(const base of bases){
    const actual=cells.filter(cell=>baseOf(cell)===base&&scenario.candidates[cell].includes(pattern.digit))
    expect(sorted(actual)).toEqual(sorted(rectangle.filter(cell=>baseOf(cell)===base)))
    expect(actual).toHaveLength(2)
   }
   // Enumerate only local row/column consequences. These are not claims that
   // both hypotheses extend to a completed (uniquely solved) puzzle.
   const choices=bases.map(base=>rectangle.filter(cell=>baseOf(cell)===base))
   const cases=choices[0].flatMap(first=>choices[1].filter(second=>crossingOf(first)!==crossingOf(second)).map(second=>[first,second]))
   expect(cases).toHaveLength(2)
   for(const pair of cases){
    expect(sorted(pair.map(crossingOf))).toEqual(crossings)
    for(const elimination of step.eliminations){
     expect(elimination.digit).toBe(pattern.digit)
     expect(crossings).toContain(crossingOf(elimination.cell))
     expect(bases).not.toContain(baseOf(elimination.cell))
     expect(scenario.candidates[elimination.cell]).toContain(pattern.digit)
     expect(pair.some(cell=>crossingOf(cell)===crossingOf(elimination.cell))).toBe(true)
    }
   }
   const remaining=scenario.candidates[scenario.target].filter(digit=>!step.eliminations.some(action=>action.cell===scenario.target&&action.digit===digit))
   expect(remaining).toEqual([scenario.digit])
   expect(finish.candidates[scenario.target]).toEqual(remaining)
   expect(finish.placements).toContainEqual({cell:scenario.target,digit:scenario.digit})
   expect(finish.xWing).toBeUndefined()
   for(const prior of scenario.provenance.priorSteps)expect('xWing' in prior).toBe(false)
  }
 })

 it('keeps stable original identities and replays their transposed clue sources',()=>{
  expect(lesson.scenarios.map(scenario=>scenario.id)).toEqual(['x-wing-1','x-wing-2','x-wing-3','x-wing-4'])
  expect(new Set(lesson.scenarios.map(scenario=>scenario.provenance.originalPuzzle.join(''))).size).toBe(lesson.scenarios.length)
  expect(lesson.scenarios.map(scenario=>scenario.provenance.priorSteps.length)).toEqual([29,16,29,16])
  for(let index=0;index<2;index++){
   const original=lesson.scenarios[index],transposed=lesson.scenarios[index+2]
   expect(original.provenance.puzzleId).toBe(`catalog:advanced:${index}`)
   expect(original.steps[0].xWing?.orientation).toBe('columns')
   expect(transposed.steps[0].xWing?.orientation).toBe('rows')
   expect(transposed.provenance.source).toBe('generated-transform')
   expect(transposed.provenance.puzzleId).toBe(`${original.provenance.puzzleId}:transpose:digit-shift-0`)
   expect(transposed.provenance.sourcePuzzle).toEqual(original.provenance.originalPuzzle)
   expect(transposed.provenance.transformation).toEqual({transpose:true,digitShift:0})
   expect(transposed.provenance.originalPuzzle).toEqual(cells.map(cell=>original.provenance.originalPuzzle[cell%9*9+Math.floor(cell/9)]))
  }
 })

 it('uses readable paragraphs for exact premises, both cases, eliminations, and the real placement',()=>{
  expect(lesson.rule).toMatch(/rectangle/i)
  expect(lesson.rule).toMatch(/diagonal/i)
  for(const scenario of lesson.scenarios){
   const step=scenario.steps[0],pattern=step.xWing!
   const paragraphs=step.explanation.split('\n\n')
   expect(paragraphs).toHaveLength(5)
   expect(paragraphs[0]).toContain(`Focus on ${step.digit}`)
   expect(paragraphs[0].match(/only two/g)).toHaveLength(2)
   const unit=(cell:number)=>pattern.orientation==='rows'?cell%9:Math.floor(cell/9)
   const base=(cell:number)=>pattern.orientation==='rows'?Math.floor(cell/9):cell%9
   const bases=pattern.orientation==='rows'?pattern.rows:pattern.columns
   const crossings=pattern.orientation==='rows'?pattern.columns:pattern.rows
   const at=(b:number,c:number)=>step.cells.find(cell=>base(cell)===b&&unit(cell)===c)!
   const a=at(bases[0],crossings[0]),b=at(bases[1],crossings[0])
   const c=at(bases[0],crossings[1]),d=at(bases[1],crossings[1])
   expect(paragraphs[1]).toContain(`If ${coordinate(a)} is ${step.digit}, then ${coordinate(d)} must be ${step.digit}`)
   expect(paragraphs[1]).toContain(`blocks ${step.digit} at ${coordinate(b)}`)
   expect(paragraphs[2]).toContain(`If ${coordinate(c)} is ${step.digit}, then ${coordinate(b)} must be ${step.digit}`)
   expect(paragraphs[2]).toContain(`blocks ${step.digit} at ${coordinate(d)}`)
   expect(paragraphs[3]).toMatch(/either way/i)
   for(const action of step.eliminations)expect(paragraphs[3]).toContain(coordinate(action.cell))
   expect(paragraphs[4]).toContain(`${coordinate(scenario.target)} changes from {${scenario.candidates[scenario.target].join(', ')}} to {${scenario.digit}}`)
   expect(paragraphs[4]).toContain(`place ${scenario.digit}`)
   expect(step.explanation).not.toMatch(/both.*(?:valid solution|complete solution)|extend.*solution|cover set|base set|confined/i)
  }
 })
})
