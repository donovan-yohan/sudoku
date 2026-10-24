import {readFileSync} from 'node:fs'
import {createElement,useState} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach,describe,expect,it,vi} from 'vitest'
import Board, {type BoardProps} from './components/Board'
import Walkthrough, {type WalkthroughScenario} from './components/Walkthrough'
import {PRACTICAL_LESSONS} from './practical-lessons'

vi.mock('react',async importOriginal=>{
 const react=await importOriginal<typeof import('react')>()
 return {...react,useState:vi.fn(react.useState)}
})

afterEach(()=>vi.clearAllMocks())

function renderWalkthrough(scenario:WalkthroughScenario,applied=0,revealed=false){
 // Static rendering controls only the hook snapshot; Board and all deduction
 // replay logic remain real. Mounted interaction coverage lives in the browser suite.
 vi.mocked(useState).mockReturnValueOnce([applied,vi.fn()]).mockReturnValueOnce([revealed,vi.fn()]).mockReturnValueOnce([null,vi.fn()])
 return renderToStaticMarkup(createElement(Walkthrough,{title:'Lesson focus',scenario,onComplete:()=>{},cellIdPrefix:scenario.id}))
}

function gridcells(html:string){
 return [...html.matchAll(/<button\b[^>]*role="gridcell"[^>]*>[\s\S]*?<\/button>/g)].map(match=>match[0])
}

function noteDigits(cell:string){
 const notes=cell.match(/<span class="cell-notes"[^>]*>([\s\S]*)<\/span><\/button>/)?.[1]??''
 return [...notes.matchAll(/>([1-9]) <\/span>/g)].map(match=>Number(match[1]))
}

describe('Lesson digit focus on the board',()=>{
 function renderBoard(overrides:Partial<BoardProps>={}){
  const notes=Array.from({length:81},()=>[] as number[])
  notes[0]=[2,5,8]
  notes[1]=[5,7]
  const visibleNotes=notes.map(list=>[...list])
  visibleNotes[1]=[]
  return renderToStaticMarkup(createElement(Board,{
   values:Array(81).fill(0),givens:Array(81).fill(0),notes,visibleNotes,
   selected:1,onSelect:()=>{},label:'Digit focus',candidates:true,...overrides,
  }))
 }

 it('emphasizes only matching visible candidate glyphs without filtering the domain',()=>{
  const cells=gridcells(renderBoard({focusDigit:5}))
  expect(noteDigits(cells[0])).toEqual([2,5,8])
  expect(cells[0]).toContain('<span class="lesson-digit-focus">5 </span>')
  expect(cells[0]).not.toMatch(/class="lesson-digit-focus">[28]/)
  expect(cells[1]).not.toContain('lesson-digit-focus')
  expect(cells[1]).toContain('candidates 5, 7')
 })

 it('emphasizes matching entries and givens on their actual value glyphs',()=>{
  const values=Array(81).fill(0),givens=Array(81).fill(0)
  values[2]=5;givens[2]=5
  values[3]=5
  values[4]=8;givens[4]=8
  const cells=gridcells(renderBoard({values,givens,focusDigit:5}))
  for(const cell of [2,3]){
   expect(cells[cell]).toContain('class="cell-value lesson-digit-focus"')
   expect(cells[cell]).not.toMatch(/<button[^>]*class="[^"]*lesson-digit-focus/)
  }
  expect(cells[2]).toContain('given 5')
  expect(cells[3]).toContain('entry 5')
  expect(cells[4]).not.toContain('lesson-digit-focus')
 })

 it('leaves ordinary boards unfocused by default or with an explicit null focus',()=>{
  for(const props of [{},{focusDigit:null}]){
   const html=renderBoard(props)
   expect(html).not.toContain('lesson-digit-focus')
   expect(noteDigits(gridcells(html)[0])).toEqual([2,5,8])
  }
 })

 it('keeps the existing candidate filter independent of the lesson focus',()=>{
  const cells=gridcells(renderBoard({focusDigit:5,candidateFocus:2}))
  expect(noteDigits(cells[0])).toEqual([2])
  expect(cells[0]).not.toContain('lesson-digit-focus')
 })
})

const xWingScenarios=PRACTICAL_LESSONS.find(lesson=>lesson.id==='x-wing')!.scenarios

describe('Lesson focus presentation',()=>{
 it('scopes readable light and dark focus colors plus an underline to walkthroughs',()=>{
  const css=readFileSync(new URL('./walkthrough.css',import.meta.url),'utf8')
  const light=css.match(/(?:^|\n)\.walkthrough \.lesson-digit-focus\s*\{([^}]*)\}/)?.[1]??''
  const dark=css.match(/:root\[data-theme=dark\] \.walkthrough \.lesson-digit-focus\s*\{([^}]*)\}/)?.[1]??''
  expect(light).toMatch(/color:\s*#166534\b/)
  expect(light).toMatch(/text-decoration:\s*underline\b/)
  expect(light).toMatch(/text-decoration-thickness:\s*1px\b/)
  expect(dark).toMatch(/color:\s*#86efac\b/)
  expect(`${light}${dark}`).not.toMatch(/animation|transition/)
 })
})

describe('Revealed lesson step focus',()=>{
 it.each(xWingScenarios)('uses the current step digit rather than the final placement digit in $id',scenario=>{
  for(let applied=0;applied<scenario.steps.length;applied++){
   const html=renderWalkthrough(scenario,applied,true)
   const step=scenario.steps[applied]
   const focused=[...html.matchAll(/<span class="[^"]*\blesson-digit-focus\b[^"]*"[^>]*>([1-9]) ?<\/span>/g)].map(match=>Number(match[1]))
   expect(focused.length).toBeGreaterThan(0)
   expect(new Set(focused)).toEqual(new Set([step.digit]))
  }
 })

 it.each(xWingScenarios)('does not focus a digit while idle, after applying, after reset or when finished in $id',scenario=>{
  for(let applied=0;applied<=scenario.steps.length;applied++)expect(renderWalkthrough(scenario,applied,false)).not.toContain('lesson-digit-focus')
  expect(renderWalkthrough(scenario,scenario.steps.length,true)).not.toContain('lesson-digit-focus')
 })
})

describe('X-Wing lesson candidate census',()=>{
 it.each(xWingScenarios)('shows the full candidate domains in both rows and both columns of $id',scenario=>{
  const original=structuredClone(scenario)
  const html=renderToStaticMarkup(createElement(Walkthrough,{title:'X-Wing',scenario,onComplete:()=>{},cellIdPrefix:scenario.id}))
  const cells=gridcells(html)
  const relevant=new Set([
   ...scenario.evidence,
   ...scenario.steps.flatMap(step=>[...step.cells,...step.placements.map(item=>item.cell),...step.eliminations.map(item=>item.cell)]),
  ])
  for(const step of scenario.steps){
   if(!step.xWing)continue
   for(let cell=0;cell<81;cell++){
    if(step.xWing.rows.includes(Math.floor(cell/9))||step.xWing.columns.includes(cell%9))relevant.add(cell)
   }
  }
  expect(cells).toHaveLength(81)
  for(let cell=0;cell<81;cell++){
   const expected=!scenario.board[cell]&&relevant.has(cell)?scenario.candidates[cell]:[]
   expect(noteDigits(cells[cell]),`${scenario.id} r${Math.floor(cell/9)+1}c${cell%9+1}`).toEqual(expected)
  }
  expect(scenario).toEqual(original)
 })
})
