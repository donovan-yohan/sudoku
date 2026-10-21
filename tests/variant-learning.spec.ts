import {expect,test} from '@playwright/test'
import { waitForBoard } from './puzzle-fixture'
import {PRACTICAL_VARIANT_LESSONS} from '../src/practical-variant-lessons'

test('learning groups general, X and Killer techniques without mixing catalogs',async({page})=>{
 await page.goto('/'); await waitForBoard(page);await page.getByRole('button',{name:'Learn',exact:true}).click()
 const group=page.getByRole('group',{name:'Lesson type',exact:true})
 await expect(group).toBeVisible()
 await group.getByRole('button',{name:'General',exact:true}).click()
 await expect(page.locator('.lesson-link')).toHaveCount(8)
 await group.getByRole('button',{name:'X Sudoku',exact:true}).click()
 await expect(page.locator('.lesson-link')).toHaveCount(2)
 await expect(page.locator('.lesson-link').first()).toContainText(/diagonal/i)
 await page.locator('.lesson-link').first().click()
 await expect(page.locator('.cell.diagonal')).toHaveCount(17)
 await page.getByRole('button',{name:'All lessons',exact:false}).click()
 await group.getByRole('button',{name:'Killer Sudoku',exact:true}).click()
 await expect(page.locator('.lesson-link')).toHaveCount(2)
 await page.locator('.lesson-link').first().click()
 expect(await page.locator('.cage-total').count()).toBeGreaterThan(0)
 await expect(page.locator('.walkthrough-heading')).toContainText('Digits in a Killer cage')
})

test('all X and Killer walkthroughs reach actual number placements',async({page})=>{
 await page.goto('/'); await waitForBoard(page);await page.getByRole('button',{name:'Learn',exact:true}).click()
 for(const lesson of PRACTICAL_VARIANT_LESSONS){
  const type=lesson.scenarios[0].variant==='x'?'X Sudoku':'Killer Sudoku'
  await page.getByRole('group',{name:'Lesson type',exact:true}).getByRole('button',{name:type,exact:true}).click()
  await page.getByRole('button',{name:new RegExp(`^${lesson.title}.*Not started`)}).click()
  for(let index=0;index<lesson.scenarios.length;index++){
   const scenario=lesson.scenarios[index]
   await page.getByRole('button',{name:`Example ${index+1}`,exact:true}).click()
   expect(await page.locator('.cell.given .cell-value').count()).toBeGreaterThanOrEqual(22)
   await expect(page.locator('fieldset,.action-kind,.lesson-steps,.diagram-caption,.lesson-prompt')).toHaveCount(0)
   for(const step of scenario.steps){
    await page.getByRole('button',{name:'Show next step',exact:true}).click()
    await expect(page.locator('.lesson-step')).toContainText(step.explanation)
    const placement=step.placements[0]
    const name=placement?`Place ${placement.digit} at r${Math.floor(placement.cell/9)+1}c${placement.cell%9+1}`:'Apply step'
    await page.getByRole('button',{name,exact:true}).click()
   }
   await expect(page.locator(`[data-cell="${scenario.target}"] .cell-value`)).toHaveText(String(scenario.digit))
   await expect(page.getByRole('button',{name:'Reset',exact:true})).toBeFocused()
  }
  await page.getByRole('button',{name:'All lessons',exact:false}).click()
  await expect(page.getByRole('button',{name:new RegExp(`^${lesson.title}.*Completed`)})).toBeVisible()
 }
})
