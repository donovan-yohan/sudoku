import {expect,test,type Page} from '@playwright/test'
import { waitForBoard, waitForSavedGame } from './puzzle-fixture'
import {getDailyPuzzle} from './puzzle-fixture'

async function position(page:Page){
 const date=await page.locator('time').getAttribute('datetime')
 const puzzle=getDailyPuzzle(date!,'beginner')
 const cell=puzzle.givens.indexOf(0)
 const wrong=puzzle.solution[cell]===9?1:puzzle.solution[cell]+1
 return {puzzle,cell,wrong}
}
async function settings(page:Page){
 await page.getByRole('button',{name:'Settings',exact:true}).click()
 return page.getByRole('dialog',{name:'Settings',exact:true})
}

for(const theme of ['light','dark'] as const)test(`Notes is a stable readable toggle in ${theme}`,async({page})=>{
 await page.emulateMedia({colorScheme:theme});await page.goto('/'); await waitForBoard(page)
 const notes=page.getByRole('button',{name:'Notes',exact:true})
 await expect(notes).toHaveAttribute('aria-pressed','false')
 await expect(notes.locator('svg')).toHaveCount(1)
 await notes.click();await expect(notes).toHaveAttribute('aria-pressed','true');await notes.hover()
 await page.waitForTimeout(200)
 const contrast=await notes.evaluate(element=>{
  const s=getComputedStyle(element)
  const luminance=(color:string)=>{const channels=color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(n=>{const v=n/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return .2126*channels[0]+.7152*channels[1]+.0722*channels[2]}
  const a=luminance(s.color),b=luminance(s.backgroundColor)
  return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)
 })
 expect(contrast).toBeGreaterThanOrEqual(4.5)
 await notes.focus();await page.keyboard.press('Space');await expect(notes).toHaveAttribute('aria-pressed','false')
 await expect(notes).toHaveText('Notes')
 await expect(page.getByRole('button',{name:'Auto-notes',exact:true})).toHaveCount(0)
})

test('settings keep preferences across reload and restore keyboard focus',async({page})=>{
 await page.goto('/'); await waitForBoard(page)
 const dialog=await settings(page)
 await expect(dialog.getByRole('button',{name:'Close',exact:true})).toBeFocused()
 await expect(dialog.getByRole('checkbox',{name:'Show mistakes',exact:true})).not.toBeChecked()
 await dialog.getByLabel('Theme',{exact:true}).selectOption('dark')
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark')
 await dialog.getByRole('checkbox',{name:'Completion effects',exact:true}).uncheck()
 await dialog.getByRole('checkbox',{name:'Show mistakes',exact:true}).check()
 await page.keyboard.press('Escape')
 await expect(page.getByRole('button',{name:'Settings',exact:true})).toBeFocused()
 await waitForSavedGame(page); await page.reload(); await waitForBoard(page);await expect(page.locator('html')).toHaveAttribute('data-theme','dark')
 const restored=await settings(page)
 await expect(restored.getByRole('checkbox',{name:'Completion effects',exact:true})).not.toBeChecked()
 await expect(restored.getByRole('checkbox',{name:'Show mistakes',exact:true})).toBeChecked()
})

test('malformed show mistakes preference defaults off',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('sudoku-show-mistakes','true'))
 await page.goto('/'); await waitForBoard(page)
 const dialog=await settings(page)
 await expect(dialog.getByRole('checkbox',{name:'Show mistakes',exact:true})).not.toBeChecked()
})

test('active navigation keeps readable text on hover',async({page})=>{
 await page.emulateMedia({colorScheme:'light'});await page.goto('/'); await waitForBoard(page)
 const daily=page.getByRole('button',{name:'Daily',exact:true})
 await daily.hover();await page.waitForTimeout(200)
 await expect(daily).toHaveCSS('color','rgb(0, 0, 0)')
})

test('duplicate mistakes remain silent and unmarked by default',async({page})=>{
 await page.goto('/'); await waitForBoard(page)
 const {puzzle,cell}=await position(page)
 const peer=puzzle.givens.findIndex((value,index)=>value!==0&&(Math.floor(index/9)===Math.floor(cell/9)||index%9===cell%9))
 expect(peer).toBeGreaterThanOrEqual(0)
 const target=page.locator(`[data-cell="${cell}"]`)
 await target.click();await target.press(String(puzzle.givens[peer]))
 await expect(page.locator('[aria-invalid="true"],.conflict,.mistake,.mistake-shake')).toHaveCount(0)
 await expect(target).not.toHaveAccessibleName(/incorrect|conflict/)
 await expect(page.locator('.game-status')).toHaveText('Entry updated.')
})

test('mistake animation ends on the digit without replacing or defocusing the cell',async({page})=>{
 await page.goto('/'); await waitForBoard(page)
 const {cell,wrong}=await position(page)
 const dialog=await settings(page);await dialog.getByRole('checkbox',{name:'Show mistakes',exact:true}).check();await page.keyboard.press('Escape')
 const target=page.locator(`[data-cell="${cell}"]`)
 await target.click()
 const original=await target.elementHandle()
 await target.press(String(wrong))
 await expect(target.locator('.mistake-shake')).toHaveCount(1)
 await expect(target).toBeFocused()
 await expect(target).toHaveAccessibleName(/incorrect/)
 expect(await target.evaluate((element,previous)=>element===previous,original)).toBe(true)
 await expect(target.locator('.mistake-shake')).toHaveCount(0)
 await expect(target).toHaveAttribute('aria-invalid','true')
 await target.press(String(wrong));await expect(page.locator('.mistake-shake')).toHaveCount(0)
 await target.press('ArrowRight');await expect(page.locator('.mistake-shake')).toHaveCount(0)
 await page.getByRole('button',{name:'Undo',exact:true}).click();await page.getByRole('button',{name:'Redo',exact:true}).click()
 await expect(target).toHaveAttribute('aria-invalid','true')
 await expect(page.locator('.mistake-shake')).toHaveCount(0)
})

test('denied preferences default mistakes off and retain changes in memory',async({page})=>{
 await page.addInitScript(()=>{
  Storage.prototype.getItem=()=>{throw new DOMException('Denied','SecurityError')}
  Storage.prototype.setItem=()=>{throw new DOMException('Denied','SecurityError')}
 })
 await page.goto('/'); await waitForBoard(page)
 const {cell,wrong}=await position(page)
 const dialog=await settings(page)
 await expect(dialog.getByRole('checkbox',{name:'Show mistakes',exact:true})).not.toBeChecked()
 await dialog.getByRole('checkbox',{name:'Show mistakes',exact:true}).check()
 await dialog.getByRole('button',{name:'Close',exact:true}).click()
 await expect(page.getByRole('button',{name:'Settings',exact:true})).toBeFocused()
 const target=page.locator(`[data-cell="${cell}"]`)
 await target.click();await target.press(String(wrong))
 await expect(target).toHaveAttribute('aria-invalid','true')
 const reopened=await settings(page)
 await expect(reopened.getByRole('checkbox',{name:'Show mistakes',exact:true})).toBeChecked()
})

test('incorrect entries stay unmarked until mistakes are enabled, then only new mistakes shake',async({page})=>{
 await page.goto('/'); await waitForBoard(page)
 const {puzzle,cell,wrong}=await position(page)
 const target=page.locator(`[data-cell="${cell}"]`)
 await target.click();await target.press(String(wrong))
 await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0)
 await expect(page.locator('.mistake-shake')).toHaveCount(0)
 const dialog=await settings(page)
 await dialog.getByRole('checkbox',{name:'Show mistakes',exact:true}).check();await page.keyboard.press('Escape')
 await expect(target).toHaveAttribute('aria-invalid','true')
 await expect(target).toHaveClass(/mistake/)
 await expect(target).toHaveCSS('color','rgb(185, 28, 28)')
 await expect(page.locator('.mistake-shake')).toHaveCount(0)
 await target.click();await target.press('Backspace');await target.press(String(wrong))
 await expect(target.locator('.mistake-shake')).toHaveCount(1)
 await expect(target.locator('.mistake-shake')).toHaveCSS('animation-name','mistake-shake')
 await expect(target).toHaveAttribute('aria-invalid','true')
 await target.press(String(puzzle.solution[cell]))
 await expect(target).not.toHaveAttribute('aria-invalid','true')
 await expect(target.locator('.mistake-shake')).toHaveCount(0)
 await page.getByRole('button',{name:'Undo',exact:true}).click()
 await expect(target).toHaveAttribute('aria-invalid','true')
 await expect(page.locator('.mistake-shake')).toHaveCount(0)
 await waitForSavedGame(page); await page.reload(); await waitForBoard(page)
 await expect(target).toHaveAttribute('aria-invalid','true')
 await expect(page.locator('.mistake-shake')).toHaveCount(0)
 const reopened=await settings(page)
 await reopened.getByRole('checkbox',{name:'Show mistakes',exact:true}).uncheck();await page.keyboard.press('Escape')
 await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0)
})

test('mistakes detect non-duplicate wrong answers without marking givens or notes',async({page})=>{
 await page.goto('/'); await waitForBoard(page)
 const {puzzle}=await position(page)
 let target=-1,digit=0
 for(let cell=0;cell<81&&target<0;cell++)if(!puzzle.givens[cell])for(let n=1;n<=9;n++){
  if(n===puzzle.solution[cell])continue
  const duplicate=puzzle.givens.some((v,i)=>v===n&&(Math.floor(i/9)===Math.floor(cell/9)||i%9===cell%9||(Math.floor(i/27)===Math.floor(cell/27)&&Math.floor(i%9/3)===Math.floor(cell%9/3))))
  if(!duplicate){target=cell;digit=n;break}
 }
 expect(target).toBeGreaterThanOrEqual(0)
 const dialog=await settings(page);await dialog.getByRole('checkbox',{name:'Show mistakes',exact:true}).check();await page.keyboard.press('Escape')
 const cell=page.locator(`[data-cell="${target}"]`)
 await cell.click();await cell.press('n');await cell.press(String(digit))
 await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0)
 await expect(page.locator('.mistake-shake')).toHaveCount(0)
 await cell.press('n');await cell.press(String(digit))
 await expect(cell).toHaveAttribute('aria-invalid','true')
 await expect(page.locator('.cell.given[aria-invalid="true"]')).toHaveCount(0)
})

test('reduced motion keeps red mistake feedback without shaking',async({page})=>{
 await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});await page.goto('/'); await waitForBoard(page)
 const {cell,wrong}=await position(page)
 const dialog=await settings(page);await dialog.getByRole('checkbox',{name:'Show mistakes',exact:true}).check();await page.keyboard.press('Escape')
 const target=page.locator(`[data-cell="${cell}"]`)
 await target.click();await target.press(String(wrong))
 await expect(target).toHaveCSS('color','rgb(248, 113, 113)')
 await expect(target).toHaveAttribute('aria-invalid','true')
 const animations=await target.evaluate(element=>element.getAnimations({subtree:true}).filter(animation=>animation.playState==='running').length)
 expect(animations).toBe(0)
})
