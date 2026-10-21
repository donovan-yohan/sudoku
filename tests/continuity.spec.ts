import {test,expect} from '@playwright/test'
import { waitForBoard, waitForSavedGame, installGameOnNextLoad } from './puzzle-fixture'
import {readFileSync} from 'node:fs'
import {createGame} from '../src/game'
import type {PracticalLesson} from '../src/practical-lessons'
const PRACTICAL_LESSONS=JSON.parse(readFileSync(new URL('../src/practical-lesson-data.json',import.meta.url),'utf8')) as PracticalLesson[]

test('practice identity and edits survive reload',async({page})=>{
 await page.goto('/'); await waitForBoard(page)
 await page.getByRole('button',{name:'Practice',exact:true}).click(); await waitForBoard(page,/^v2:practice:.*:classic:beginner$/)
 await page.getByRole('button',{name:'Expert',exact:true}).click(); await waitForBoard(page,/^v2:practice:.*:classic:expert$/)
 const board=page.getByRole('grid',{name:'Practice Sudoku'})
 const cell=board.getByRole('gridcell',{name:/empty/}).first()
 const id=await cell.getAttribute('data-cell')
 await cell.click();await cell.press('n');await cell.press('3')
 await waitForSavedGame(page)
 const before=await page.evaluate(()=>localStorage.getItem('sudoku-session-v1'))
 await page.reload(); await waitForBoard(page)
 await expect(page.getByRole('grid',{name:'Practice Sudoku'})).toBeVisible()
 await expect(page.getByRole('button',{name:'Expert',exact:true})).toHaveAttribute('aria-pressed','true')
 await expect(page.locator(`[data-cell="${id}"]`)).toHaveAccessibleName(/notes 3/)
 expect(await page.evaluate(()=>localStorage.getItem('sudoku-session-v1'))).toBe(before)
})

test('UTC rollover retains unfinished daily after reload and offers new day',async({page})=>{
 await page.clock.install({time:new Date('2026-10-20T23:59:58Z')})
 await page.goto('/'); await waitForBoard(page)
 const board=page.getByRole('grid',{name:'Daily Sudoku'})
 const cell=board.getByRole('gridcell',{name:/empty/}).first()
 const id=await cell.getAttribute('data-cell')
 await cell.click();await cell.press('n');await cell.press('6')
 await page.clock.fastForward(4000)
 await expect(page.getByRole('button',{name:"Open today's puzzle"})).toBeVisible()
 await expect(page.locator('time')).toHaveAttribute('datetime','2026-10-20')
 await waitForSavedGame(page); await page.reload(); await waitForBoard(page)
 await expect(page.locator('time')).toHaveAttribute('datetime','2026-10-20')
 await expect(page.locator(`[data-cell="${id}"]`)).toHaveAccessibleName(/notes 6/)
 await page.getByRole('button',{name:"Open today's puzzle"}).click(); await waitForBoard(page,'v2:daily:2026-10-21:classic:beginner')
 await expect(page.locator('time')).toHaveAttribute('datetime','2026-10-21')
})

test('undoing a completed puzzle announces unfinished state',async({page})=>{
 await page.goto('/'); await waitForBoard(page)
 const {getDailyPuzzle}=await import('./puzzle-fixture')
 const date=await page.locator('time').getAttribute('datetime'),puzzle=getDailyPuzzle(date!,'beginner'),target=puzzle.givens.indexOf(0)
 await waitForSavedGame(page)
 const state=createGame(puzzle); state.values=[...puzzle.solution]; state.values[target]=0; state.selected=target
 await installGameOnNextLoad(page,state)
 await page.reload(); await waitForBoard(page, puzzle.id);await page.locator(`[data-cell="${target}"]`).click();await page.keyboard.press(String(puzzle.solution[target]))
 await page.getByRole('button',{name:'Undo',exact:true}).click()
 await expect(page.locator('.game-status')).toContainText('Move undone')
 await expect(page.locator('.game-status')).not.toContainText('Puzzle complete')
})

test('placement lesson readouts describe the placed value',async({page})=>{
 const lesson=PRACTICAL_LESSONS[0],scenario=lesson.scenarios[0]
 await page.goto('/'); await waitForBoard(page);await page.getByRole('button',{name:'Learn',exact:true}).click();await page.getByRole('button',{name:new RegExp(`^${lesson.title}.*Not started`)}).click()
 const board=page.getByRole('grid',{name:`${lesson.title} example 1`}),target=board.locator(`[data-cell="${scenario.target}"]`)
 await target.click()
 await expect(target).toHaveAccessibleName(new RegExp(`empty, candidates ${scenario.candidates[scenario.target].join(', ')}`))
 for(const step of scenario.steps){
  await page.getByRole('button',{name:'Show next step',exact:true}).click()
  await expect(page.locator('.lesson-step')).toContainText(step.explanation)
  const placement=step.placements[0]
  const name=placement?`Place ${placement.digit} at r${Math.floor(placement.cell/9)+1}c${placement.cell%9+1}`:'Apply step'
  await page.getByRole('button',{name,exact:true}).click()
 }
 await expect(target).toHaveAccessibleName(`Row ${Math.floor(scenario.target/9)+1}, column ${scenario.target%9+1}, entry ${scenario.digit}`)
 await expect(target.locator('.cell-value')).toHaveText(String(scenario.digit))
 await expect(target.locator('.cell-notes')).toHaveCount(0)
 await expect(page.locator('.walkthrough-result')).toHaveCount(1)
 await expect(page.locator('.walkthrough-result')).toHaveText(`r${Math.floor(scenario.target/9)+1}c${scenario.target%9+1} = ${scenario.digit}`)
 await expect(page.locator('.candidate-readout,.selection-readout,.proposed-action')).toHaveCount(0)
})

test('hinted final placement earns the same full-board finale',async({page})=>{
 await page.goto('/'); await waitForBoard(page)
 const {getDailyPuzzle}=await import('./puzzle-fixture')
 const date=await page.locator('time').getAttribute('datetime')
 const puzzle=getDailyPuzzle(date!,'beginner'),target=puzzle.givens.indexOf(0)
 await waitForSavedGame(page)
 const state=createGame(puzzle); state.values=[...puzzle.solution]; state.values[target]=0; state.selected=target
 await installGameOnNextLoad(page,state)
 await page.reload(); await waitForBoard(page, puzzle.id)
 await page.getByRole('button',{name:'Hint',exact:true}).click()
 await page.getByRole('button',{name:'Apply this step',exact:true}).click()
 await expect(page.locator('.game-status')).toContainText('Puzzle complete')
 await expect(page.locator('[data-reward-variant="finale"]')).toHaveCount(1)
 const widths=await page.locator('.reward-layer,.reward-layer *').evaluateAll(elements=>elements.flatMap(element=>{const style=getComputedStyle(element);return ['borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth'].map(key=>parseFloat(style[key as keyof CSSStyleDeclaration] as string)||0)}))
 expect(Math.max(...widths)).toBeLessThanOrEqual(1)
})

test('reduced motion suppresses effects while preserving completion status',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'})
 await page.goto('/'); await waitForBoard(page)
 const {getDailyPuzzle}=await import('./puzzle-fixture')
 const date=await page.locator('time').getAttribute('datetime')
 const puzzle=getDailyPuzzle(date!,'beginner')
 await waitForSavedGame(page)
 const state=createGame(puzzle); state.values=[...puzzle.solution]; state.selected=puzzle.givens.indexOf(0); state.values[state.selected]=0
 await installGameOnNextLoad(page,state)
 await page.reload(); await waitForBoard(page, puzzle.id)
 const target=puzzle.givens.indexOf(0)
 await page.locator(`[data-cell="${target}"]`).click();await page.keyboard.press(String(puzzle.solution[target]))
 await expect(page.locator('.game-status')).toContainText('Puzzle complete')
 const effect=page.locator('.reward-layer')
 await expect(effect).toHaveCSS('display','none')
})
