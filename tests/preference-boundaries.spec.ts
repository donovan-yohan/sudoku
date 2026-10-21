import {expect,test} from '@playwright/test'
import { waitForBoard } from './puzzle-fixture'

for(const stored of ['true','false','1','{}','broken'])test(`malformed mistake preference ${stored} stays off`,async({page})=>{
 await page.addInitScript(value=>localStorage.setItem('sudoku-show-mistakes',value),stored)
 await page.goto('/'); await waitForBoard(page)
 await page.getByRole('button',{name:'Settings',exact:true}).click()
 await expect(page.getByRole('checkbox',{name:'Show mistakes',exact:true})).not.toBeChecked()
})

for(const width of [320,390,1440])for(const theme of ['light','dark'] as const)test(`settings fit ${width}px in ${theme}`,async({page})=>{
 await page.setViewportSize({width,height:700});await page.emulateMedia({colorScheme:theme});await page.goto('/'); await waitForBoard(page)
 await page.getByRole('button',{name:'Settings',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'Settings',exact:true})
 await expect(dialog).toBeVisible()
 const rect=await dialog.boundingBox();expect(rect).not.toBeNull();expect(rect!.x).toBeGreaterThanOrEqual(0);expect(rect!.x+rect!.width).toBeLessThanOrEqual(width)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await dialog.getByRole('checkbox',{name:'Show mistakes',exact:true}).check()
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Settings',exact:true})).toBeFocused()
})

test('blocked preference writes preserve the current setting and keep playing',async({page})=>{
 await page.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='sudoku-show-mistakes')throw new DOMException('blocked','QuotaExceededError');return original.call(this,key,value)}})
 await page.goto('/'); await waitForBoard(page)
 await page.getByRole('button',{name:'Settings',exact:true}).click()
 const checkbox=page.getByRole('checkbox',{name:'Show mistakes',exact:true})
 await checkbox.check();await expect(checkbox).toBeChecked();await page.keyboard.press('Escape')
 await expect(page.getByRole('grid')).toBeVisible()
 await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(checkbox).toBeChecked()
})
