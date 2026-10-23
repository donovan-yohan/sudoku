import {expect,test,type Page} from '@playwright/test'
import {completeUnits,createGame} from '../src/game'
import type {Difficulty} from '../src/types'
import type {GameVariant} from '../src/variant-engine'
import {generateRequestedPuzzle,generatedPracticeRequest,getDailyPuzzle,installGameOnNextLoad,waitForBoard,waitForSavedGame} from './puzzle-fixture'

type FixtureOptions = {difficulty?:Difficulty;variant?:GameVariant;practice?:boolean;date?:string;preEarned?:boolean}
async function almostComplete(page:Page,options:FixtureOptions={}){
 if(options.date)await page.clock.install({time:new Date(`${options.date}T12:00:00Z`)})
 await page.goto('/');await waitForBoard(page)
 if(options.variant){await page.getByLabel('Game mode',{exact:true}).selectOption(options.variant);await waitForBoard(page,new RegExp(`:${options.variant}:beginner$`))}
 if(options.difficulty){await page.getByRole('button',{name:new RegExp(`^${options.difficulty}$`,'i')}).click();await waitForBoard(page,new RegExp(`:${options.difficulty}$`))}
 if(options.practice){await page.getByRole('button',{name:'Practice',exact:true}).click();await waitForBoard(page,/^v3:practice:/)}
 const id=await page.locator('.board-column').getAttribute('data-puzzle-id')
 const puzzle=options.practice
  ?generateRequestedPuzzle(generatedPracticeRequest(id!.split(':')[2],options.variant??'classic',options.difficulty??'beginner'))
  :getDailyPuzzle((await page.locator('time').getAttribute('datetime'))!,options.difficulty??'beginner',options.variant??'classic')
 const target=puzzle.givens.indexOf(0)
 await waitForSavedGame(page)
 const state=createGame(puzzle)
 state.values=[...puzzle.solution];state.values[target]=0;state.selected=target
 state.rewarded=options.preEarned?Array.from({length:27},(_,i)=>i):completeUnits(state.values,puzzle.solution);state.elapsed=125
 await installGameOnNextLoad(page,state)
 await page.reload();await waitForBoard(page,puzzle.id)
 expect(await page.getByRole('gridcell').evaluateAll(cells=>cells.map(cell=>Number(cell.querySelector('.cell-value')?.textContent||0)))).toEqual(state.values)
 return {puzzle,target}
}

async function finishPuzzle(page:Page,fixture:Awaited<ReturnType<typeof almostComplete>>){
 const cell=page.locator(`[data-cell="${fixture.target}"]`)
 await cell.click();await cell.press(String(fixture.puzzle.solution[fixture.target]))
}

async function finishCelebration(page:Page){
 await page.locator('[data-reward-variant="finale"]').evaluate(element=>element.getAnimations({subtree:true}).forEach(animation=>animation.finish()))
}

test('completion dialog waits for the celebration and shows the final time',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'})
 const {puzzle,target}=await almostComplete(page)
 const cell=page.locator(`[data-cell="${target}"]`)
 await cell.click();await cell.press(String(puzzle.solution[target]))
 const finale=page.locator('[data-reward-variant="finale"]')
 await expect(finale).toHaveCount(1)
 // Hold the actual animation to prove a nominal timeout cannot cover the board.
 await finale.evaluate(element=>element.getAnimations({subtree:true}).forEach(animation=>animation.pause()))
 const finalTime=await page.locator('.timer').textContent()
 const dialog=page.getByRole('dialog',{name:'Puzzle complete',exact:true})
 await page.waitForTimeout(2600)
 await expect(dialog).toHaveCount(0)
 await finale.evaluate(element=>element.getAnimations({subtree:true}).forEach(animation=>animation.finish()))
 await expect(dialog).toBeVisible()
 await expect(dialog.locator('.completion-time')).toHaveText(finalTime!)
 await expect(dialog.getByRole('button',{name:'New practice puzzle',exact:true})).toBeVisible()
 await expect(dialog.getByRole('button',{name:'Previous daily puzzle',exact:true})).toBeVisible()
 await expect(dialog.getByRole('button',{name:'Close',exact:true})).toBeVisible()
})

test('completion opens after the unmodified natural celebration',async({page})=>{
 const fixture=await almostComplete(page)
 await finishPuzzle(page,fixture)
 await expect(page.getByRole('dialog',{name:'Puzzle complete',exact:true})).toBeVisible()
})

test('forced colors releases completion without animation',async({page})=>{
 await page.emulateMedia({forcedColors:'active'})
 const fixture=await almostComplete(page)
 await finishPuzzle(page,fixture)
 await expect(page.getByRole('dialog',{name:'Puzzle complete',exact:true})).toBeVisible({timeout:1500})
})

for(const preference of ['effects off','reduced motion'] as const)test(`completion opens immediately with ${preference}`,async({page})=>{
 if(preference==='effects off')await page.addInitScript(()=>localStorage.setItem('sudoku-effects','off'))
 else await page.emulateMedia({reducedMotion:'reduce'})
 const fixture=await almostComplete(page)
 await finishPuzzle(page,fixture)
 const dialog=page.getByRole('dialog',{name:'Puzzle complete',exact:true})
 await expect(dialog).toBeVisible({timeout:1500})
 await expect(dialog.locator('.completion-time')).toHaveText(await page.locator('.timer').textContent() as string)
 await page.keyboard.press('Escape')
 await expect(dialog).toHaveCount(0)
 await expect(page.locator(`[data-cell="${fixture.target}"]`)).toBeFocused()
 await page.getByRole('button',{name:'Undo',exact:true}).click()
 await page.getByRole('button',{name:'Redo',exact:true}).click()
 await expect(dialog).toHaveCount(0)
 await waitForSavedGame(page);await page.reload();await waitForBoard(page,fixture.puzzle.id)
 await expect(dialog).toHaveCount(0)
})

for(const action of ['New practice puzzle','Previous daily puzzle'])for(const variant of ['classic','x','killer'] as const)for(const practice of [false,true])test(`${action} retains intermediate ${variant} from ${practice?'practice':'daily'}`,async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'})
 const fixture=await almostComplete(page,{difficulty:'intermediate',variant,date:'2026-10-20',practice})
 await finishPuzzle(page,fixture)
 const dialog=page.getByRole('dialog',{name:'Puzzle complete',exact:true})
 await dialog.getByRole('button',{name:action,exact:true}).click()
 const next=action==='New practice puzzle'?new RegExp(`^v3:practice:.*:${variant}:intermediate$`):`v3:daily:2026-10-19:${variant}:intermediate`
 await waitForBoard(page,next)
 await expect(dialog).toHaveCount(0)
 await expect(page.getByLabel('Game mode',{exact:true})).toHaveValue(variant)
 await expect(page.getByRole('group',{name:'Difficulty',exact:true}).getByRole('button',{name:'Intermediate',exact:true})).toHaveAttribute('aria-pressed','true')
 const id=await page.locator('.board-column').getAttribute('data-puzzle-id')
 expect(id).not.toBe(fixture.puzzle.id)
 await waitForSavedGame(page);await page.reload();await waitForBoard(page,id!)
 await expect(dialog).toHaveCount(0)
})

test('hinted final placement opens completion after the celebration',async({page})=>{
 await almostComplete(page)
 await page.getByRole('button',{name:'Hint',exact:true}).click()
 await page.getByRole('button',{name:'Apply this step',exact:true}).click()
 await finishCelebration(page)
 await expect(page.getByRole('dialog',{name:'Puzzle complete',exact:true})).toBeVisible()
})

test('first full solve still celebrates when every unit was rewarded earlier',async({page})=>{
 const fixture=await almostComplete(page,{preEarned:true})
 await finishPuzzle(page,fixture)
 await expect(page.locator('[data-reward-variant="finale"] .reward-cell')).toHaveCount(81)
 await finishCelebration(page)
 await expect(page.getByRole('dialog',{name:'Puzzle complete',exact:true})).toBeVisible()
})

for(const action of ['undo','learn','new puzzle','restart'] as const)test(`${action} cancels a pending completion`,async({page})=>{
 const fixture=await almostComplete(page)
 await finishPuzzle(page,fixture)
 if(action==='undo')await page.getByRole('button',{name:'Undo',exact:true}).click()
 else if(action==='learn')await page.getByRole('button',{name:'Learn',exact:true}).click()
 else if(action==='restart'){
  await page.getByRole('button',{name:'Restart puzzle',exact:true}).click()
  await page.getByRole('button',{name:'Clear entries and notes',exact:true}).click()
 }
 else {await page.getByRole('button',{name:'Practice',exact:true}).click();await waitForBoard(page,/^v3:practice:/)}
 await page.waitForTimeout(2700)
 await expect(page.getByRole('dialog',{name:'Puzzle complete',exact:true})).toHaveCount(0)
 if(action==='undo'){
  await page.getByRole('button',{name:'Redo',exact:true}).click()
  await expect(page.getByRole('dialog',{name:'Puzzle complete',exact:true})).toHaveCount(0)
  await page.getByRole('button',{name:'Undo',exact:true}).click()
  await waitForSavedGame(page);await page.reload();await waitForBoard(page,fixture.puzzle.id)
  await finishPuzzle(page,fixture)
  await expect(page.getByRole('dialog',{name:'Puzzle complete',exact:true})).toHaveCount(0)
 }
})

test('turning effects off releases completion without stacking dialogs',async({page})=>{
 const fixture=await almostComplete(page)
 await finishPuzzle(page,fixture)
 await page.locator('[data-reward-variant="finale"]').evaluate(element=>element.getAnimations({subtree:true}).forEach(animation=>animation.pause()))
 await page.getByRole('button',{name:'Settings',exact:true}).click()
 await page.getByRole('checkbox',{name:'Completion effects',exact:true}).uncheck()
 await expect(page.getByRole('dialog')).toHaveCount(1)
 await expect(page.getByRole('dialog',{name:'Settings',exact:true})).toBeVisible()
 await page.keyboard.press('Escape')
 await expect(page.getByRole('dialog',{name:'Puzzle complete',exact:true})).toBeVisible({timeout:1500})
})

test('completion waits behind settings and keeps keyboard focus inside',async({page})=>{
 const fixture=await almostComplete(page)
 await finishPuzzle(page,fixture)
 await page.getByRole('button',{name:'Settings',exact:true}).click()
 await finishCelebration(page)
 await expect(page.getByRole('dialog')).toHaveCount(1)
 await expect(page.getByRole('dialog',{name:'Settings',exact:true})).toBeVisible()
 await page.keyboard.press('Escape')
 const dialog=page.getByRole('dialog',{name:'Puzzle complete',exact:true})
 await expect(dialog).toBeVisible()
 const buttons=dialog.getByRole('button')
 await expect(buttons.first()).toBeFocused()
 await page.keyboard.press('Shift+Tab')
 await expect(buttons.last()).toBeFocused()
 await page.keyboard.press('Tab')
 await expect(buttons.first()).toBeFocused()
 await dialog.getByRole('button',{name:'Close',exact:true}).click()
 await expect(page.getByRole('button',{name:'Settings',exact:true})).toBeFocused()
})

test('enabling reduced motion during celebration releases completion',async({page})=>{
 const fixture=await almostComplete(page)
 await finishPuzzle(page,fixture)
 await page.locator('[data-reward-variant="finale"]').evaluate(element=>element.getAnimations({subtree:true}).forEach(animation=>animation.pause()))
 await page.emulateMedia({reducedMotion:'reduce'})
 await expect(page.getByRole('dialog',{name:'Puzzle complete',exact:true})).toBeVisible({timeout:1500})
})

test('archive-start completion never offers a pre-archive daily',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'})
 const fixture=await almostComplete(page,{date:'2026-01-01'})
 await finishPuzzle(page,fixture)
 const dialog=page.getByRole('dialog',{name:'Puzzle complete',exact:true})
 await expect(dialog).toBeVisible()
 const previous=dialog.getByRole('button',{name:'Previous daily puzzle',exact:true})
 if(await previous.count())await expect(previous).toBeDisabled()
 await expect(dialog.getByRole('button',{name:'New practice puzzle',exact:true})).toBeEnabled()
})

for(const theme of ['light','dark'] as const)test(`completion fits a narrow phone in ${theme}`,async({page},testInfo)=>{
 await page.setViewportSize({width:320,height:640})
 await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'})
 const fixture=await almostComplete(page)
 await finishPuzzle(page,fixture)
 const dialog=page.getByRole('dialog',{name:'Puzzle complete',exact:true})
 await expect(dialog).toBeVisible()
 const rect=await dialog.boundingBox()
 expect(rect).not.toBeNull();expect(rect!.x).toBeGreaterThanOrEqual(0);expect(rect!.x+rect!.width).toBeLessThanOrEqual(320)
 expect(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true)
 for(const button of await dialog.getByRole('button').all()){
  const box=await button.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44)
 }
 await expect(dialog).toHaveCSS('border-radius','0px')
 await expect(dialog).toHaveCSS('border-top-width','1px')
 await expect(dialog).toHaveCSS('background-color',theme==='dark'?'rgb(0, 0, 0)':'rgb(255, 255, 255)')
 await page.screenshot({path:testInfo.outputPath(`completion-${theme}.png`)})
 await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'})
 const violations=await page.evaluate(async()=>{
  const axe=(window as unknown as {axe:{run:(target:Document,options:unknown)=>Promise<{violations:{id:string;impact:string}[]}>}}).axe
  const result=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}})
  return result.violations.map((violation:{id:string;impact:string})=>({id:violation.id,impact:violation.impact}))
 })
 expect(violations).toEqual([])
})
