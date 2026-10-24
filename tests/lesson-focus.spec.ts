import {expect,test} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import type {PracticalLesson} from '../src/practical-lessons'
import {waitForBoard} from './puzzle-fixture'

const require=createRequire(import.meta.url)
const axeSource=readFileSync(require.resolve('axe-core/axe.min.js'),'utf8')
const lesson=(JSON.parse(readFileSync(new URL('../src/practical-lesson-data.json',import.meta.url),'utf8')) as PracticalLesson[]).find(lesson=>lesson.id==='x-wing')!
const coordinate=(cell:number)=>`r${Math.floor(cell/9)+1}c${cell%9+1}`

for(let example=0;example<4;example++)test(`X-Wing ${example+1} exposes the complete census and follows the revealed digit`,async({page},testInfo)=>{
 const theme=example<2?'dark':'light'
 await page.setViewportSize({width:example%2?390:1000,height:1000})
 await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'})
 const errors:string[]=[]
 page.on('pageerror',error=>errors.push(error.message))
 await page.goto('/');await waitForBoard(page)
 await expect(page.locator('.lesson-digit-focus')).toHaveCount(0)
 await page.getByRole('button',{name:'Learn',exact:true}).click()
 await page.getByRole('button',{name:/^X-Wing.*Not started/}).click()
 await page.getByRole('button',{name:`Example ${example+1}`,exact:true}).click()
 const scenario=lesson.scenarios[example],pattern=scenario.steps[0].xWing!
 const board=page.getByRole('grid',{name:`X-Wing example ${example+1}`,exact:true})
 const relevant=new Set([...scenario.evidence,...scenario.steps.flatMap(step=>[...step.cells,...step.placements.map(item=>item.cell),...step.eliminations.map(item=>item.cell)])])
 const expectedNotes=scenario.candidates.map((list,cell)=>relevant.has(cell)||pattern.rows.includes(Math.floor(cell/9))||pattern.columns.includes(cell%9)?list:[])
 const readNotes=()=>board.getByRole('gridcell').evaluateAll(cells=>cells.map(cell=>Array.from(cell.querySelectorAll('.cell-notes>span')).map(span=>Number(span.textContent)).filter(Boolean)))
 expect(await readNotes()).toEqual(expectedNotes)
 await expect(board.locator('.lesson-digit-focus')).toHaveCount(0)
 const initial=await board.getByRole('gridcell').allTextContents()
 const progress=await page.evaluate(()=>localStorage.getItem('sudoku-lessons-v1'))
 for(let index=0;index<scenario.steps.length;index++){
  const step=scenario.steps[index]
  await page.getByRole('button',{name:'Show next step',exact:true}).click()
  const allDigits=await board.locator('.cell-value,.cell-notes>span').evaluateAll(elements=>elements.filter(element=>element.textContent?.trim()).map(element=>({digit:Number(element.textContent),focused:element.classList.contains('lesson-digit-focus')})))
  expect(allDigits.filter(item=>item.focused).length).toBeGreaterThan(0)
  for(const item of allDigits)expect(item.focused).toBe(item.digit===step.digit)
  const highlights=board.locator('.lesson-digit-focus')
  const color=theme==='dark'?'rgb(134, 239, 172)':'rgb(22, 101, 52)'
  for(const highlight of await highlights.all()){
   await expect(highlight).toHaveCSS('color',color)
   await expect(highlight).toHaveCSS('text-decoration-line','underline')
  }
  const given=board.locator('.given .lesson-digit-focus')
  await expect(given.first()).toBeVisible()
  if(index===0){
   expect(await readNotes()).toEqual(expectedNotes)
   expect(await board.getByRole('gridcell').allTextContents()).toEqual(initial)
   expect(await page.evaluate(()=>localStorage.getItem('sudoku-lessons-v1'))).toBe(progress)
   for(const cell of await board.getByRole('gridcell').all()){
    const index=Number(await cell.getAttribute('data-cell'))
    if(expectedNotes[index].length)await expect(cell).toHaveAccessibleName(new RegExp(`candidates ${expectedNotes[index].join(', ')}`))
   }
   if(example===1){
    // The extra 3s in column 8 explain why the same four corners do not prove a 3 X-Wing.
    const baseCells=scenario.candidates.flatMap((notes,cell)=>pattern.columns.includes(cell%9)&&notes.includes(3)?[cell]:[])
    expect(baseCells.filter(cell=>!step.cells.includes(cell)).length).toBeGreaterThan(0)
    for(const cell of baseCells)await expect(board.locator(`[data-cell="${cell}"] .cell-notes`)).toContainText('3')
   }
   await page.screenshot({path:testInfo.outputPath(`lesson-focus-${theme}-${example+1}.png`),fullPage:true})
   await page.route('**/__test/axe.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:axeSource}))
   await page.addScriptTag({url:'/__test/axe.js'})
   const violations=await page.evaluate(async()=>{
    const axe=(window as unknown as {axe:{run:()=>Promise<{violations:unknown[]}>}}).axe
    return (await axe.run()).violations
   })
   expect(violations).toEqual([])
  }
  const placement=step.placements[0]
  await page.getByRole('button',{name:placement?`Place ${placement.digit} at ${coordinate(placement.cell)}`:'Apply step',exact:true}).click()
  await expect(board.locator('.lesson-digit-focus')).toHaveCount(0)
 }
 await expect(board.locator(`[data-cell="${scenario.target}"] .cell-value`)).toHaveText(String(scenario.digit))
 await page.getByRole('button',{name:'Reset',exact:true}).click()
 expect(await readNotes()).toEqual(expectedNotes)
 await expect(board.locator('.lesson-digit-focus')).toHaveCount(0)
 await page.getByRole('button',{name:'Show next step',exact:true}).click()
 await expect(board.locator('.lesson-digit-focus').first()).toBeVisible()
 await page.getByRole('button',{name:'Reset',exact:true}).click()
 await expect(board.locator('.lesson-digit-focus')).toHaveCount(0)
 expect(await readNotes()).toEqual(expectedNotes)
 await page.getByRole('button',{name:'Show next step',exact:true}).click()
 await expect(board.locator('.lesson-digit-focus').first()).toBeVisible()
 const nextExample=example===3?1:example+2
 await page.getByRole('button',{name:`Example ${nextExample}`,exact:true}).click()
 const nextBoard=page.getByRole('grid',{name:`X-Wing example ${nextExample}`,exact:true})
 await expect(nextBoard).toBeVisible()
 await expect(nextBoard.getByRole('gridcell')).toHaveCount(81)
 await expect(nextBoard.locator('.lesson-digit-focus')).toHaveCount(0)
 await page.getByRole('button',{name:'Show next step',exact:true}).click()
 await expect(nextBoard.locator('.lesson-digit-focus').first()).toBeVisible()
 await page.getByRole('button',{name:'Return to puzzle',exact:true}).click()
 await waitForBoard(page)
 await expect(page.locator('.walkthrough')).toHaveCount(0)
 await expect(page.locator('.lesson-digit-focus')).toHaveCount(0)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 expect(errors).toEqual([])
})
