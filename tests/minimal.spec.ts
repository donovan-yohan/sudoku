import {expect,test} from '@playwright/test'
import { waitForBoard } from './puzzle-fixture'

for(const width of [320,390,1440])for(const theme of ['light','dark'] as const)test(`quiet centered play at ${width}px in ${theme}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.emulateMedia({colorScheme:theme});await page.goto('/'); await waitForBoard(page)
 const board=page.getByRole('grid',{name:'Daily Sudoku'})
 await expect(board).toBeVisible()
 await expect(page.locator('aside,.hero,.site-footer')).toHaveCount(0)
 for(const text of ['A moment of focus','One cell at a time.','A nudge, not an answer.','Make room for a thought.','A little more clarity,','Look for one logical step.'])await expect(page.getByText(text,{exact:false})).toHaveCount(0)
 const box=await board.boundingBox();expect(box).not.toBeNull();expect(Math.abs(box!.x+box!.width/2-width/2)).toBeLessThan(2)
 expect(box!.y).toBeLessThan(230)
 const hint=page.getByRole('button',{name:'Hint',exact:true})
 await expect(hint.locator('svg')).toHaveCount(1);expect((await hint.innerText()).trim()).toBe('')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 const widths=await page.locator('body *').evaluateAll(els=>els.filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height).flatMap(e=>{const s=getComputedStyle(e);return ['borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','outlineWidth'].map(p=>p==='outlineWidth'&&s.outlineStyle==='none'?0:parseFloat(s[p as keyof CSSStyleDeclaration] as string)||0)}))
 expect(Math.max(...widths)).toBeLessThanOrEqual(1)
 const svgStrokes=await page.locator('svg *').evaluateAll(elements=>elements.filter(element=>getComputedStyle(element).stroke!=='none').map(element=>parseFloat(getComputedStyle(element).strokeWidth)||0))
 expect(Math.max(0,...svgStrokes)).toBeLessThanOrEqual(1)
 const regular=await board.locator('[data-cell="0"]').evaluate(e=>getComputedStyle(e).borderRightColor)
 const boxEdge=await board.locator('[data-cell="2"]').evaluate(e=>getComputedStyle(e).borderRightColor)
 expect(regular).not.toBe(boxEdge)
})

test('hairline strokes remain consistent through keyboard focus, hints, dialogs and lessons',async({page})=>{
 await page.goto('/'); await waitForBoard(page)
 const assertStrokes=async()=>{
  const strokes=await page.locator('body *').evaluateAll(es=>es.filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height&&getComputedStyle(e).visibility!=='hidden').flatMap(e=>{const s=getComputedStyle(e);return ['borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth'].map(k=>parseFloat(s[k as keyof CSSStyleDeclaration] as string)||0).concat(s.outlineStyle==='none'?0:parseFloat(s.outlineWidth)||0)}))
  expect(Math.max(...strokes)).toBeLessThanOrEqual(1)
 }
 await page.getByRole('button',{name:'Hint',exact:true}).focus();await page.keyboard.press('Tab');await assertStrokes()
 await page.getByRole('button',{name:'Hint',exact:true}).click();await assertStrokes();await page.getByRole('button',{name:'Close hint',exact:true}).click()
 await page.getByRole('button',{name:'Help',exact:true}).click();await assertStrokes();await page.keyboard.press('Escape')
 await page.getByRole('button',{name:'Learn',exact:true}).click();await page.locator('.lesson-link').last().click();await assertStrokes()
 const cell=page.getByRole('grid').locator('[tabindex="0"]');await cell.focus();await page.keyboard.press('ArrowRight');await assertStrokes()
})

test('lightbulb opens only requested hint and closes without editing',async({page})=>{
 await page.goto('/'); await waitForBoard(page)
 const board=page.getByRole('grid'),before=await board.locator('.cell-value').allTextContents()
 await page.getByRole('button',{name:'Hint',exact:true}).click()
 await expect(page.getByRole('button',{name:'Apply this step',exact:true})).toBeVisible()
 expect(await board.locator('.cell-value').allTextContents()).toEqual(before)
 await page.getByRole('button',{name:'Close hint',exact:true}).click()
 await expect(page.getByRole('button',{name:'Apply this step',exact:true})).toHaveCount(0)
 expect(await board.locator('.cell-value').allTextContents()).toEqual(before)
})
