import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Board from './components/Board'
import Learning, { parseLessonProgress } from './components/Learning'
import { LESSONS, evaluateLesson } from './lessons'
import {PRACTICAL_LESSONS} from './practical-lessons'
import HintPanel from './components/HintPanel'
import Dialog from './components/Dialog'

describe('Assistance', () => {
  it('offers an explanatory hint only after an explicit request', () => {
    const html = renderToStaticMarkup(createElement(HintPanel, { values: Array(81).fill(0), onApply: () => {}, onHint: () => {} }))
    expect(html).toContain('Hint')
    expect(html).not.toContain('You choose whether to apply it')
    expect(html).toContain('aria-label="Hint"')
    expect(html).toContain('<svg')
    expect(html).not.toContain('Apply this step')
  })
  it('labels a native modal dialog with its supplied heading', () => {
    const html = renderToStaticMarkup(createElement(Dialog, { title: 'Restart?', onClose: () => {}, children: createElement('button', null, 'Cancel') }))
    expect(html).toContain('<dialog')
    expect(html).toContain('aria-labelledby=')
    expect(html).toContain('Restart?')
  })
})

describe('Lesson interface', () => {
  it('lists the genuine catalog without defensive catalog prose', () => {
    const html = renderToStaticMarkup(createElement(Learning, { onReturn: () => {} }))
    for (const lesson of LESSONS) expect(html).toContain(lesson.title)
    expect(html).not.toContain('Prerequisites')
    expect(html).not.toContain('your own pencil notes are not proof')
    expect(html).not.toContain('guided, bounded deductions')
    expect(html).not.toContain('does not measure independent mastery')
    expect(html).toContain('Not started')
    expect(html).not.toContain('A new way to see the grid')
  })
  it('uses real puzzle walkthroughs rather than candidate-study captions',()=>{
    for(const lesson of PRACTICAL_LESSONS){
     for(const scenario of lesson.scenarios){
      expect(scenario.board.filter(Boolean).length).toBeGreaterThanOrEqual(22)
      expect(scenario.caption).not.toMatch(/Candidate study|claimed|not a playable|assumed|No unique/i)
      expect(scenario.steps.at(-1)?.placements.length).toBeGreaterThan(0)
     }
    }
  })
  it('gives mathematical retry guidance without accusing the learner of guessing',()=>{
    const scenario=LESSONS[0].scenarios[0]
    const result=evaluateLesson(scenario,{cell:scenario.target,digit:scenario.digit===9?1:9,kind:scenario.kind})
    expect(result.correct).toBe(false)
    expect(result.message).not.toContain('not a guessed answer')
  })
  it('accepts only known scenario ids in the versioned progress envelope', () => {
    const scenario = LESSONS[0].scenarios[0].id
    expect(parseLessonProgress(JSON.stringify({ version: 1, passed: [scenario, 'unknown', scenario] }))).toEqual([scenario])
    for (const bad of ['null', '{}', '{', '{"version":1,"passed":[4]}', '{"version":2,"passed":[]}']) expect(parseLessonProgress(bad)).toEqual([])
  })
})

describe('Sudoku board', () => {
  it('marks both X diagonals without changing the number of gridcells',()=>{
    const html=renderToStaticMarkup(createElement(Board,{values:Array(81).fill(0),givens:Array(81).fill(0),notes:Array.from({length:81},()=>[]),selected:0,onSelect:()=>{},label:'X Sudoku',variant:'x'}))
    expect((html.match(/class="cell[^\"]* diagonal/g)||[])).toHaveLength(17)
    expect((html.match(/role="gridcell"/g)||[])).toHaveLength(81)
  })
  it('renders Killer cage sums and accessible membership without exposing solutions',()=>{
    const html=renderToStaticMarkup(createElement(Board,{values:Array(81).fill(0),givens:Array(81).fill(0),notes:Array.from({length:81},()=>[]),selected:0,onSelect:()=>{},label:'Killer Sudoku',variant:'killer',cages:[{cells:[0,1],sum:3}]}))
    expect(html).toContain('class="cage-total"')
    expect(html).toContain('cage sum 3')
    expect((html.match(/class="[^"]* caged"[^>]*data-cage="0"/g)||[])).toHaveLength(2)
    expect(html).toContain('class="cage-outlines"')
    expect(html).not.toContain('class="cage-edge')
  })
  it('separates visible candidate digits to match the spoken label', () => {
    const html=renderToStaticMarkup(createElement(Board,{values:Array(81).fill(0),givens:Array(81).fill(0),notes:Array.from({length:81},()=>[1,2,3]),selected:0,onSelect:()=>{},label:'Candidates',candidates:true}))
    expect(html).toContain('>1 </span>')
    expect(html).toContain('>2 </span>')
  })
  it('renders nine accessible rows, 81 labelled cells and one tab stop', () => {
    const values = Array(81).fill(0); values[0] = 5
    const html = renderToStaticMarkup(createElement(Board, {
      values, givens: values, notes: Array.from({ length: 81 }, () => []),
      selected: 1, onSelect: () => {}, label: 'Daily Sudoku',
    }))
    expect((html.match(/role="row"/g) || []).length).toBe(9)
    expect((html.match(/role="gridcell"/g) || []).length).toBe(81)
    expect((html.match(/tabindex="0"/g) || []).length).toBe(1)
    expect(html).toContain('Row 1, column 1, given 5')
    expect(html).toContain('Row 1, column 2, empty')
  })
})
