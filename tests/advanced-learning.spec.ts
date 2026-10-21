import {expect,test} from '@playwright/test'
import {readFileSync,mkdirSync} from 'node:fs'
import {createRequire} from 'node:module'
import {waitForBoard} from './puzzle-fixture'
import type {PracticalLesson} from '../src/practical-lessons'
const lessons=(JSON.parse(readFileSync(new URL('../src/practical-lesson-data.json',import.meta.url),'utf8')) as PracticalLesson[]).filter(lesson=>['naked-triple','swordfish','xy-wing'].includes(lesson.id))
const coordinate=(cell:number)=>`r${Math.floor(cell/9)+1}c${cell%9+1}`
const axeSource=readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'),'utf8')

for(const lesson of lessons)test(`${lesson.title} explains its actual candidates and consequences in every example`,async({page})=>{
 await page.setViewportSize({width:390,height:1000})
 await page.addInitScript(theme=>localStorage.setItem('sudoku-theme',theme),lesson.id==='swordfish'?'dark':'light')
 const errors:string[]=[]
 page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/__test/axe.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:axeSource}))
 await page.goto('/');await waitForBoard(page)
 await page.getByRole('button',{name:'Learn',exact:true}).click()
 await page.getByRole('button',{name:new RegExp(`^${lesson.title}.*Not started`)}).click()
 for(let example=0;example<lesson.scenarios.length;example++){
  const scenario=lesson.scenarios[example],first=scenario.steps[0]
  await page.getByRole('button',{name:`Example ${example+1}`,exact:true}).click()
  const board=page.getByRole('grid',{name:`${lesson.title} example ${example+1}`,exact:true})
  await page.getByRole('button',{name:'Show next step',exact:true}).click()
  const paragraphs=page.locator('.step-explanation>p')
  expect(await paragraphs.count()).toBeGreaterThanOrEqual(2)
  await expect(page.locator('.lesson-step')).not.toContainText(/different cover|cells seeing both wings/i)
  for(const cell of first.cells)await expect(page.locator('.lesson-step')).toContainText(coordinate(cell))
  if(lesson.id!=='naked-triple'){
   await expect(page.locator('.lesson-step')).toContainText(/if /i)
   await expect(page.locator('.lesson-step')).toContainText(/either way|whichever|at least one/i)
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.addScriptTag({url:'/__test/axe.js'})
  const violations=await page.evaluate(async()=>(await (window as unknown as {axe:{run:()=>Promise<{violations:unknown[]}>}}).axe.run()).violations)
  expect(violations).toEqual([])
  if(process.env.SUDOKU_EVIDENCE_DIR){
   mkdirSync(process.env.SUDOKU_EVIDENCE_DIR,{recursive:true})
   await page.screenshot({path:`${process.env.SUDOKU_EVIDENCE_DIR}/${scenario.id}.png`,fullPage:true})
  }
  await page.getByRole('button',{name:'Apply step',exact:true}).click()
  await expect(board.locator(`[data-cell="${scenario.target}"] .cell-value`)).toHaveCount(0)
  await page.getByRole('button',{name:'Show next step',exact:true}).click()
  await expect(page.locator('.lesson-step')).toContainText(`{${scenario.candidates[scenario.target].join(', ')}}`)
  await expect(page.locator('.lesson-step')).toContainText(`{${scenario.digit}}`)
  await page.getByRole('button',{name:`Place ${scenario.digit} at ${coordinate(scenario.target)}`,exact:true}).click()
  await expect(page.locator('.walkthrough-result')).toHaveText(`${coordinate(scenario.target)} = ${scenario.digit}`)
 }
 expect(errors).toEqual([])
})
