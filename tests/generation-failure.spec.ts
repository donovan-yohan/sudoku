import {expect,test} from '@playwright/test'
import {waitForBoard,waitForSavedGame} from './puzzle-fixture'

test('a pre-archive device clock shows an actionable error instead of an endless spinner',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
 await page.clock.install({time:new Date('2025-12-31T12:00:00Z')})
 await page.goto('/')
 await expect(page.getByRole('button',{name:'Try again',exact:true})).toBeVisible()
 await expect(page.locator('.generation-status')).toContainText('Invalid archive date')
 await expect(page.locator('.generation-status')).not.toContainText('Generating puzzle')
 expect(errors).toEqual([])
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('sudoku-game-v2:')))).toEqual([])
 await page.getByRole('button',{name:'Practice',exact:true}).click()
 await waitForBoard(page,/^v3:practice:.*:classic:beginner$/)
})

for(const raw of ['{',JSON.stringify({version:999}), ' '.repeat(9000)])test(`rejected session data starts generated Beginner (${raw.length} bytes)`,async({page})=>{
 await page.addInitScript(raw=>localStorage.setItem('sudoku-session-v2',raw),raw)
 await page.goto('/')
 await waitForBoard(page,/^v3:daily:.*:classic:beginner$/)
 await expect(page.locator('.cell.given')).toHaveCount(45)
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('sudoku-game-v2:')&&!key.startsWith('sudoku-game-v2:v3:')))).toEqual([])
})

test('failed startup never saves or ticks a placeholder and retry loads the requested v3 puzzle',async({page})=>{
 await page.clock.install({time:new Date('2026-10-21T12:00:00Z')})
 let failures=0
 let rejectWorker=true
 await page.route('**/*generation.worker*',async route=>{
  failures++
  if(rejectWorker)await route.abort('failed')
  else await route.continue()
 })
 await page.goto('/')
 await expect(page.getByRole('button',{name:'Try again',exact:true})).toBeVisible()
 await page.clock.runFor(3000)
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('sudoku-game-v2:')))).toEqual([])
 await expect(page.locator('.timer')).toHaveText('0:00')
 rejectWorker=false
 await page.getByRole('button',{name:'Try again',exact:true}).click()
 await waitForBoard(page,'v3:daily:2026-10-21:classic:beginner')
 await expect(page.locator('.cell.given')).toHaveCount(45)
 await waitForSavedGame(page)
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('sudoku-game-v2:')&&!key.startsWith('sudoku-game-v2:v3:')))).toEqual([])
 // A controlling service worker can serve the successful retry from its shell.
 expect(failures).toBeGreaterThanOrEqual(1)
})
