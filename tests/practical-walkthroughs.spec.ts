import {expect,test} from '@playwright/test'
import { waitForBoard } from './puzzle-fixture'
import {readFileSync} from 'node:fs'
import type {PracticalLesson} from '../src/practical-lessons'
const PRACTICAL_LESSONS=JSON.parse(readFileSync(new URL('../src/practical-lesson-data.json',import.meta.url),'utf8')) as PracticalLesson[]

test('all real-puzzle walkthroughs reach their placements with only relevant notes',async({page})=>{
 await page.goto('/'); await waitForBoard(page);await page.getByRole('button',{name:'Learn',exact:true}).click()
 for(const lesson of PRACTICAL_LESSONS){
  await page.getByRole('button',{name:new RegExp(`^${lesson.title}.*Not started`)}).click()
  for(let index=0;index<lesson.scenarios.length;index++){
   const scenario=lesson.scenarios[index]
   await page.getByRole('button',{name:`Example ${index+1}`,exact:true}).click()
   const relevant=new Set([...scenario.evidence, ...scenario.steps.flatMap(step => [...step.cells, ...step.placements.map(item => item.cell), ...step.eliminations.map(item => item.cell)])])
   for(const step of scenario.steps)if(step.xWing)for(let cell=0;cell<81;cell++){
    if(step.xWing.rows.includes(Math.floor(cell/9))||step.xWing.columns.includes(cell%9))relevant.add(cell)
   }
   const annotations=await page.getByRole('grid').getByRole('gridcell').evaluateAll(elements=>elements.filter(element=>element.querySelector('.cell-notes')).map(element=>Number(element.getAttribute('data-cell'))))
   expect(annotations.every(cell=>relevant.has(cell))).toBe(true)
   expect(await page.locator('.cell.given .cell-value').count()).toBeGreaterThanOrEqual(22)
   await expect(page.locator('fieldset,.action-kind,.lesson-steps,.diagram-caption,.lesson-prompt')).toHaveCount(0)
   for(const step of scenario.steps){
    await page.getByRole('button',{name:'Show next step',exact:true}).click()
    await expect(page.locator('.lesson-step')).toContainText(step.explanation)
    const name=step.placements.length?`Place ${step.placements[0].digit} at r${Math.floor(step.placements[0].cell/9)+1}c${step.placements[0].cell%9+1}`:'Apply step'
    await page.getByRole('button',{name,exact:true}).click()
   }
   await expect(page.locator(`[data-cell="${scenario.target}"] .cell-value`)).toHaveText(String(scenario.digit))
   await expect(page.locator('.walkthrough-result')).toHaveText(`r${Math.floor(scenario.target/9)+1}c${scenario.target%9+1} = ${scenario.digit}`)
   await expect(page.getByRole('button',{name:'Reset',exact:true})).toBeFocused()
  }
  await page.getByRole('button',{name:'All lessons',exact:false}).click()
  await expect(page.getByRole('button',{name:new RegExp(`^${lesson.title}.*Completed`)})).toBeVisible()
 }
})
