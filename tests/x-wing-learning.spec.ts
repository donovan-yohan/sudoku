import {expect,test} from '@playwright/test'
import {readFileSync,mkdirSync} from 'node:fs'
import {createRequire} from 'node:module'
import {waitForBoard} from './puzzle-fixture'
import type {PracticalLesson} from '../src/practical-lessons'

const require=createRequire(import.meta.url)
const axeSource=readFileSync(require.resolve('axe-core/axe.min.js'),'utf8')
const lesson=(JSON.parse(readFileSync(new URL('../src/practical-lesson-data.json',import.meta.url),'utf8')) as PracticalLesson[]).find(lesson=>lesson.id==='x-wing')!
const coordinate=(cell:number)=>`r${Math.floor(cell/9)+1}c${cell%9+1}`

for(let example=0;example<4;example++)test(`X-Wing example ${example+1} explains both possibilities before a real placement`,async({page})=>{
 await page.setViewportSize({width:example%2?1000:390,height:1000})
 await page.addInitScript(theme=>localStorage.setItem('sudoku-theme',theme),example%2?'light':'dark')
 await page.goto('/');await waitForBoard(page)
 await page.getByRole('button',{name:'Learn',exact:true}).click()
 await page.getByRole('button',{name:/^X-Wing.*Not started/}).click()
 await expect(page.getByRole('group',{name:'Examples'}).getByRole('button')).toHaveCount(4)
 await page.getByRole('button',{name:`Example ${example+1}`,exact:true}).click()
 const scenario=lesson.scenarios[example],step=scenario.steps[0]
 const board=page.getByRole('grid',{name:`X-Wing example ${example+1}`,exact:true})
 const before=await board.innerHTML()
 const progress=await page.evaluate(()=>localStorage.getItem('sudoku-lessons-v1'))
 await expect(page.getByRole('table')).toHaveCount(0)
 await page.getByRole('button',{name:'Show next step',exact:true}).click()
 const explanation=page.locator('.lesson-step')
 await expect(explanation.getByRole('table')).toHaveCount(2)
 await expect(explanation).toContainText(/either way/i)
 await expect(explanation).toContainText(coordinate(scenario.target))
 await expect(explanation).not.toContainText(/different cover|cover set|base set/i)
 expect((await explanation.locator('.step-explanation>p').allTextContents()).map(text=>text.trim())).toEqual(step.explanation.split('\n\n'))
 const rows=[...new Set(step.cells.map(cell=>Math.floor(cell/9)))].sort((a,b)=>a-b)
 const columns=[...new Set(step.cells.map(cell=>cell%9))].sort((a,b)=>a-b)
 for(const [index,table] of (await explanation.getByRole('table').all()).entries()){
  await expect(table).toHaveAccessibleName(`Possibility ${index+1}`)
  expect(await table.getByRole('columnheader').allTextContents()).toEqual(columns.map(column=>`Column ${column+1}`))
  expect(await table.getByRole('rowheader').allTextContents()).toEqual(rows.map(row=>`Row ${row+1}`))
  const digits=await table.locator('td[data-cell]').evaluateAll(cells=>cells.filter(cell=>cell.textContent?.trim()).map(cell=>Number(cell.getAttribute('data-cell'))))
  expect(digits).toEqual(index===0?[rows[0]*9+columns[0],rows[1]*9+columns[1]]:[rows[0]*9+columns[1],rows[1]*9+columns[0]])
 }
 expect(await board.innerHTML()).toBe(before)
 expect(await page.evaluate(()=>localStorage.getItem('sudoku-lessons-v1'))).toBe(progress)
 for(const width of [320,390,768,1000]){
  await page.setViewportSize({width,height:1000})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 }
 await page.route('**/__test/axe.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:axeSource}))
 await page.addScriptTag({url:'/__test/axe.js'})
 const accessibility=await page.evaluate(async()=>{
  const axe=(window as unknown as {axe:{run:()=>Promise<{violations:unknown[]}>}}).axe
  return axe.run()
 })
 expect(accessibility.violations).toEqual([])
 if(process.env.SUDOKU_EVIDENCE_DIR){
  mkdirSync(process.env.SUDOKU_EVIDENCE_DIR,{recursive:true})
  await page.setViewportSize({width:example%2?1000:390,height:1000})
  await page.screenshot({path:`${process.env.SUDOKU_EVIDENCE_DIR}/x-wing-${example+1}.png`,fullPage:true})
 }
 await page.getByRole('button',{name:'Apply step',exact:true}).click()
 await expect(board.locator(`[data-cell="${scenario.target}"] .cell-value`)).toHaveCount(0)
 expect(await page.evaluate(()=>localStorage.getItem('sudoku-lessons-v1'))).toBe(progress)
 await page.getByRole('button',{name:'Show next step',exact:true}).click()
 await expect(page.getByRole('table')).toHaveCount(0)
 await page.getByRole('button',{name:`Place ${scenario.digit} at ${coordinate(scenario.target)}`,exact:true}).click()
 await expect(page.locator('.walkthrough-result')).toHaveText(`${coordinate(scenario.target)} = ${scenario.digit}`)
 await expect(board.locator(`[data-cell="${scenario.target}"] .cell-value`)).toHaveText(String(scenario.digit))
 await expect(page.getByRole('button',{name:'Reset',exact:true})).toBeFocused()
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('sudoku-lessons-v1')||'{}').passed)).toEqual([scenario.id])
 await page.getByRole('button',{name:'Reset',exact:true}).click()
 await expect(page.getByRole('table')).toHaveCount(0)
 await expect(page.locator('.walkthrough-result')).toHaveCount(0)
 await expect(board.locator(`[data-cell="${scenario.target}"] .cell-value`)).toHaveCount(0)
})

test('previously completed X-Wing examples remain saved without marking the new examples complete',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('sudoku-lessons-v1',JSON.stringify({version:1,passed:['x-wing-1','x-wing-2']})))
 await page.goto('/');await waitForBoard(page)
 await page.getByRole('button',{name:'Learn',exact:true}).click()
 await expect(page.getByRole('button',{name:/^X-Wing.*In progress/})).toBeVisible()
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('sudoku-lessons-v1')||'{}').passed)).toEqual(['x-wing-1','x-wing-2'])
})
