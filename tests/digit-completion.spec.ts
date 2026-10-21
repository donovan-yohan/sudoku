import {expect,test} from '@playwright/test'
import { waitForBoard, waitForSavedGame, installGameOnNextLoad } from './puzzle-fixture'
import {getDailyPuzzle} from './puzzle-fixture'
import {completeUnits,createGame} from '../src/game'

async function almostNine(page:import('@playwright/test').Page){
 await page.goto('/'); await waitForBoard(page)
 const date=await page.locator('time').getAttribute('datetime')
 const puzzle=getDailyPuzzle(date!,'beginner')
 const target=puzzle.givens.indexOf(0),digit=puzzle.solution[target]
 const state=createGame(puzzle)
 puzzle.solution.forEach((value,cell)=>{if(value===digit&&cell!==target)state.values[cell]=value})
 state.selected=target;state.rewarded=completeUnits(state.values,puzzle.solution)
 await waitForSavedGame(page)
 await installGameOnNextLoad(page,state)
 await page.reload(); await waitForBoard(page, puzzle.id)
 expect(await page.getByRole('gridcell').evaluateAll(cells=>cells.map(cell=>Number(cell.querySelector('.cell-value')?.textContent||0)))).toEqual(state.values)
 return{target,digit}
}

test('ninth correct digit hops nine digits once and disables its keypad button',async({page})=>{
 const{target,digit}=await almostNine(page)
 const pad=page.getByRole('group',{name:'Enter a number',exact:true})
 const number=pad.getByRole('button',{name:`Enter ${digit}`,exact:true})
 await expect(number).toBeEnabled()
 const cell=page.locator(`[data-cell="${target}"]`)
 await cell.click();await cell.press(String(digit))
 await expect(number).toBeDisabled()
 await expect(number).toHaveCSS('opacity','0.35')
 await expect(page.locator('.digit-celebrate')).toHaveCount(9)
 const orders=await page.locator('.digit-celebrate').evaluateAll(elements=>elements.map(element=>getComputedStyle(element).animationDelay))
 expect(new Set(orders).size).toBeGreaterThan(1)
 await page.getByRole('button',{name:'Undo',exact:true}).click()
 await expect(number).toBeEnabled()
 await cell.click();await cell.press(String(digit))
 await expect(page.locator('.digit-celebrate')).toHaveCount(0)
 await waitForSavedGame(page); await page.reload(); await waitForBoard(page);await expect(number).toBeDisabled();await expect(page.locator('.digit-celebrate')).toHaveCount(0)
})

test('nine copies dim the keypad without revealing whether the entries are correct',async({page})=>{
 await page.goto('/'); await waitForBoard(page)
 const values=await page.getByRole('gridcell').allTextContents()
 const counts=Array.from({length:10},()=>0);values.forEach(value=>{if(value.trim())counts[Number(value)]++})
 const digit=counts.slice(1).findIndex(count=>count<9)+1
 const empty=await page.getByRole('gridcell',{name:/empty/}).all()
 for(let i=0;i<9-counts[digit];i++){await empty[i].click();await empty[i].press(String(digit))}
 await expect(page.getByRole('group',{name:'Enter a number',exact:true}).getByRole('button',{name:`Enter ${digit}`,exact:true})).toBeDisabled()
 await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0)
 await expect(page.locator('.digit-celebrate')).toHaveCount(0)
})

test('reduced motion keeps completed digit buttons disabled without hopping',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'})
 const{target,digit}=await almostNine(page)
 const cell=page.locator(`[data-cell="${target}"]`)
 await cell.click();await cell.press(String(digit))
 await expect(page.getByRole('button',{name:`Enter ${digit}`,exact:true})).toBeDisabled()
 const moving=await page.locator('.digit-celebrate').evaluateAll(elements=>elements.flatMap(element=>element.getAnimations()).filter(animation=>animation.playState==='running').length)
 expect(moving).toBe(0)
})
