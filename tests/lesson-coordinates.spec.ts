import {expect,test} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {waitForBoard} from './puzzle-fixture'
import type {PracticalLesson} from '../src/practical-lessons'
import {PRACTICAL_VARIANT_LESSONS} from '../src/practical-variant-lessons'

const require=createRequire(import.meta.url)
const axeSource=readFileSync(require.resolve('axe-core/axe.min.js'),'utf8')
const PRACTICAL_LESSONS=JSON.parse(readFileSync(new URL('../src/practical-lesson-data.json',import.meta.url),'utf8')) as PracticalLesson[]

test('lesson coordinate hyperlinks highlight and reveal the exact example cell without applying a step',async({page})=>{
 await page.setViewportSize({width:390,height:700})
 await page.goto('/');await waitForBoard(page)
 await page.getByRole('button',{name:'Learn',exact:true}).click()
 await page.getByRole('button',{name:/^X-Wing.*Not started/}).click()
 await page.getByRole('button',{name:'Show next step',exact:true}).click()
 const board=page.getByRole('grid',{name:'X-Wing example 1',exact:true})
 const before=await board.getByRole('gridcell').evaluateAll(cells=>cells.map(cell=>cell.textContent))
 const progress=await page.evaluate(()=>localStorage.getItem('sudoku-lessons-v1'))
 const reference=page.locator('.step-explanation').getByRole('link',{name:'r3c3',exact:true}).first()
 await expect(reference).toBeVisible()
 await expect(reference).toHaveCSS('text-decoration-line','underline')
 await reference.click()
 const cell=board.locator('[data-cell="20"]')
 await expect(cell).toHaveAttribute('aria-selected','true')
 await expect(cell).toBeFocused()
 await expect(cell).toBeInViewport()
 expect(await board.getByRole('gridcell').evaluateAll(cells=>cells.map(cell=>cell.textContent))).toEqual(before)
 expect(await page.evaluate(()=>localStorage.getItem('sudoku-lessons-v1'))).toBe(progress)
 await expect(page.getByRole('button',{name:'Apply step',exact:true})).toBeVisible()
})

for(const lesson of [...PRACTICAL_LESSONS,...PRACTICAL_VARIANT_LESSONS])test(`every ${lesson.title} example links all cell references to its own board`,async({page})=>{
 test.setTimeout(90_000)
 await page.goto('/');await waitForBoard(page)
 await page.getByRole('button',{name:'Learn',exact:true}).click()
 const variant=lesson.scenarios[0].variant
 if(variant!=='classic')await page.getByRole('button',{name:variant==='x'?'X Sudoku':'Killer Sudoku',exact:true}).click()
 await page.getByRole('button',{name:new RegExp(`^${lesson.title}.*Not started`)}).click()
 for(let example=0;example<lesson.scenarios.length;example++){
  const scenario=lesson.scenarios[example]
  await page.getByRole('button',{name:`Example ${example+1}`,exact:true}).click()
  const board=page.getByRole('grid',{name:`${lesson.title} example ${example+1}`,exact:true})
  for(const step of scenario.steps){
   await page.getByRole('button',{name:'Show next step',exact:true}).click()
   const explanation=page.locator('.step-explanation')
   expect(await explanation.locator('p').allTextContents()).toEqual(step.explanation.split('\n\n').map((paragraph,index)=>`${index>0?'\n\n':''}${paragraph}`))
   const expected=step.explanation.match(/\br[1-9]c[1-9]\b/gi)??[]
   expect(await explanation.getByRole('link').allTextContents()).toEqual(expected)
   const texts=await board.getByRole('gridcell').allTextContents()
   const progress=await page.evaluate(()=>localStorage.getItem('sudoku-lessons-v1'))
   for(const reference of [...new Set(expected)]){
    const link=explanation.getByRole('link',{name:reference,exact:true}).first()
    await expect(link).toHaveCSS('text-decoration-line','underline')
    const row=Number(reference[1]),column=Number(reference[3]),cell=board.locator(`[data-cell="${(row-1)*9+column-1}"]`)
    await link.click()
    await expect(cell).toHaveAttribute('aria-selected','true')
    await expect(cell).toBeFocused()
    await expect(cell).toBeInViewport()
    expect(await link.getAttribute('href')).toBe(`#${await cell.getAttribute('id')}`)
   }
   const placement=step.placements[0]
   if(placement){
    const reference=`r${Math.floor(placement.cell/9)+1}c${placement.cell%9+1}`
    await page.locator('.lesson-step h3').getByRole('link',{name:reference,exact:true}).click()
    await expect(board.locator(`[data-cell="${placement.cell}"]`)).toHaveAttribute('aria-selected','true')
   }
   expect(await board.getByRole('gridcell').allTextContents()).toEqual(texts)
   expect(await page.evaluate(()=>localStorage.getItem('sudoku-lessons-v1'))).toBe(progress)
   await page.getByRole('button',{name:placement?`Place ${placement.digit} at r${Math.floor(placement.cell/9)+1}c${placement.cell%9+1}`:'Apply step',exact:true}).click()
  }
  const result=page.locator('.walkthrough-result')
  const reference=`r${Math.floor(scenario.target/9)+1}c${scenario.target%9+1}`
  await expect(result).toHaveText(`${reference} = ${scenario.digit}`)
  await result.getByRole('link',{name:reference,exact:true}).click()
  await expect(board.locator(`[data-cell="${scenario.target}"]`)).toBeFocused()
  const saved=await page.evaluate(()=>localStorage.getItem('sudoku-lessons-v1'))
  await page.getByRole('button',{name:'Reset',exact:true}).click()
  await expect(result).toHaveCount(0)
  await expect(page.locator('.step-explanation a')).toHaveCount(0)
  expect(await page.evaluate(()=>localStorage.getItem('sudoku-lessons-v1'))).toBe(saved)
 }
})

for(const theme of ['light','dark'] as const)test(`coordinate links support keyboard focus and mobile layout in ${theme}`,async({page},testInfo)=>{
 await page.setViewportSize({width:320,height:640})
 await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'})
 await page.goto('/');await waitForBoard(page)
 await page.getByRole('button',{name:'Learn',exact:true}).click()
 await page.getByRole('button',{name:/^X-Wing.*Not started/}).click()
 await page.getByRole('button',{name:'Show next step',exact:true}).click()
 const link=page.locator('.step-explanation').getByRole('link',{name:'r3c3',exact:true}).first()
 await link.focus()
 await page.keyboard.press('Enter')
 const cell=page.getByRole('grid').locator('[data-cell="20"]')
 await expect(cell).toBeFocused()
 await expect(cell).toHaveAttribute('aria-selected','true')
 await expect(cell).toBeInViewport()
 await page.keyboard.press('ArrowRight')
 await expect(page.getByRole('grid').locator('[data-cell="21"]')).toBeFocused()
 await page.getByRole('button',{name:'Example 2',exact:true}).click()
 await page.getByRole('button',{name:'Show next step',exact:true}).click()
 const newLink=page.locator('.step-explanation').getByRole('link').first()
 const text=await newLink.textContent(),target=(Number(text![1])-1)*9+Number(text![3])-1
 await newLink.click()
 await expect(page.getByRole('grid',{name:'X-Wing example 2',exact:true}).locator(`[data-cell="${target}"]`)).toBeFocused()
 await expect(page.getByRole('grid')).toHaveCount(1)
 await newLink.scrollIntoViewIfNeeded()
 await expect(newLink).toHaveCSS('text-decoration-line','underline')
 await expect(newLink).toHaveCSS('color',theme==='dark'?'rgb(255, 255, 255)':'rgb(0, 0, 0)')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 expect(await page.locator('.active-lesson').evaluate(element=>{
  const ids=Array.from(element.querySelectorAll('[id]'),node=>node.id)
  return new Set(ids).size===ids.length
 })).toBe(true)
 await page.screenshot({path:testInfo.outputPath(`coordinate-links-${theme}.png`)})
 await page.route('**/__test/axe.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:axeSource}))
 await page.addScriptTag({url:'/__test/axe.js'})
 const violations=await page.evaluate(async()=>{
  const axe=(window as unknown as {axe:{run:()=>Promise<{violations:unknown[]}>}}).axe
  return (await axe.run()).violations
 })
 expect(violations).toEqual([])
})
