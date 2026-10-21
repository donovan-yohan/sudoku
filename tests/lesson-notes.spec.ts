import {expect,test} from '@playwright/test'
import { waitForBoard } from './puzzle-fixture'
import {readFileSync} from 'node:fs'
import type {PracticalLesson} from '../src/practical-lessons'
const PRACTICAL_LESSONS=JSON.parse(readFileSync(new URL('../src/practical-lesson-data.json',import.meta.url),'utf8')) as PracticalLesson[]

test('every real example projects evidence candidates and retains full selected-cell inspection throughout its walkthrough',async({page})=>{
 test.setTimeout(60_000)
 await page.goto('/'); await waitForBoard(page);await page.getByRole('button',{name:'Learn',exact:true}).click()
 for(const lesson of PRACTICAL_LESSONS){
  await page.getByRole('button',{name:new RegExp(`^${lesson.title}.*Not started`)}).click()
  for(let example=0;example<lesson.scenarios.length;example++){
   const scenario=lesson.scenarios[example]
   await page.getByRole('button',{name:`Example ${example+1}`,exact:true}).click()
   const board=page.getByRole('grid',{name:`${lesson.title} example ${example+1}`})
   const relevant=new Set([...scenario.evidence, ...scenario.steps.flatMap(step => [...step.cells, ...step.placements.map(item => item.cell), ...step.eliminations.map(item => item.cell)])])
   const notes=scenario.candidates.map(list=>[...list])
   const assertNotes=async()=>{
    const cells=await board.getByRole('gridcell').evaluateAll(elements=>elements.map(element=>({
     visible:Array.from(element.querySelectorAll('.cell-notes span')).map(span=>Number(span.textContent)).filter(Boolean),
     accessible:element.getAttribute('aria-label')?.match(/, candidates ([1-9](?:, [1-9])*)/)?.[1].split(', ').map(Number)||[],
    })))
    const selected=Number(await board.locator('[aria-selected="true"]').getAttribute('data-cell'))
    expect(cells).toEqual(notes.map((list,cell)=>({visible:relevant.has(cell)?list:[],accessible:relevant.has(cell)||cell===selected?list:[]})))
   }
   await expect(board.locator(`[data-cell="${scenario.target}"] .cell-value`)).toHaveCount(0)
   await assertNotes()
   for(const step of scenario.steps){
    await page.getByRole('button',{name:'Show next step',exact:true}).click()
    await assertNotes()
    const placement=step.placements[0]
    const name=placement?`Place ${placement.digit} at r${Math.floor(placement.cell/9)+1}c${placement.cell%9+1}`:'Apply step'
    await page.getByRole('button',{name,exact:true}).click()
    for(const {cell,digit} of step.placements){
     notes[cell]=[]
     notes.forEach((list,peer)=>{
      const sameUnit=Math.floor(peer/9)===Math.floor(cell/9)||peer%9===cell%9||(Math.floor(peer/27)===Math.floor(cell/27)&&Math.floor(peer%9/3)===Math.floor(cell%9/3))
      if(sameUnit)notes[peer]=list.filter(value=>value!==digit)
     })
    }
    for(const {cell,digit} of step.eliminations)notes[cell]=notes[cell].filter(value=>value!==digit)
    await assertNotes()
   }
   await expect(board.locator(`[data-cell="${scenario.target}"] .cell-value`)).toHaveText(String(scenario.digit))
  }
  await page.getByRole('button',{name:'All lessons',exact:false}).click()
 }
})
