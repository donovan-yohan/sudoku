import {test,expect} from '@playwright/test'

test('practice identity and edits survive reload',async({page})=>{
 await page.goto('/')
 await page.getByRole('button',{name:'Practice',exact:true}).click()
 await page.getByRole('button',{name:'Expert',exact:true}).click()
 const board=page.getByRole('grid',{name:'Practice Sudoku'})
 const cell=board.getByRole('gridcell',{name:/empty/}).first()
 const id=await cell.getAttribute('data-cell')
 await cell.click();await cell.press('n');await cell.press('3')
 const before=await page.evaluate(()=>localStorage.getItem('sudoku-session-v1'))
 await page.reload()
 await expect(page.getByRole('grid',{name:'Practice Sudoku'})).toBeVisible()
 await expect(page.getByRole('button',{name:'Expert',exact:true})).toHaveAttribute('aria-pressed','true')
 await expect(page.locator(`[data-cell="${id}"]`)).toHaveAccessibleName(/notes 3/)
 expect(await page.evaluate(()=>localStorage.getItem('sudoku-session-v1'))).toBe(before)
})

test('UTC rollover retains unfinished daily after reload and offers new day',async({page})=>{
 await page.clock.install({time:new Date('2026-10-20T23:59:58Z')})
 await page.goto('/')
 const board=page.getByRole('grid',{name:'Daily Sudoku'})
 const cell=board.getByRole('gridcell',{name:/empty/}).first()
 const id=await cell.getAttribute('data-cell')
 await cell.click();await cell.press('n');await cell.press('6')
 await page.clock.fastForward(4000)
 await expect(page.getByRole('button',{name:"Open today's puzzle"})).toBeVisible()
 await expect(page.locator('time')).toHaveAttribute('datetime','2026-10-20')
 await page.reload()
 await expect(page.locator('time')).toHaveAttribute('datetime','2026-10-20')
 await expect(page.locator(`[data-cell="${id}"]`)).toHaveAccessibleName(/notes 6/)
 await page.getByRole('button',{name:"Open today's puzzle"}).click()
 await expect(page.locator('time')).toHaveAttribute('datetime','2026-10-21')
})

test('undoing a completed puzzle announces unfinished state',async({page})=>{
 await page.goto('/')
 const {getDailyPuzzle}=await import('../src/puzzles')
 const date=await page.locator('time').getAttribute('datetime'),puzzle=getDailyPuzzle(date!,'beginner'),target=puzzle.givens.indexOf(0)
 await page.evaluate(({puzzle,target})=>{const values=[...puzzle.solution];values[target]=0;localStorage.setItem(`sudoku-game-v1:${puzzle.id}`,JSON.stringify({version:1,puzzleId:puzzle.id,values,selected:target,notes:Array.from({length:81},()=>[]),noteMode:false,rewarded:[],elapsed:0,hintsUsed:0}))},{puzzle,target})
 await page.reload();await page.locator(`[data-cell="${target}"]`).click();await page.keyboard.press(String(puzzle.solution[target]))
 await page.getByRole('button',{name:'Undo',exact:true}).click()
 await expect(page.locator('.game-status')).toContainText('Move undone')
 await expect(page.locator('.game-status')).not.toContainText('Puzzle complete')
})

test('placement lesson readouts describe the placed value',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Learn',exact:true}).click();await page.locator('.lesson-link').first().click()
 await page.locator('[data-cell="8"]').click();await page.getByRole('button',{name:'Choose 9',exact:true}).click();await page.getByRole('button',{name:'Check reasoning',exact:true}).click()
 await expect(page.getByRole('group',{name:'Selected cell candidates',exact:true})).toContainText('contains 9')
 await expect(page.locator('.lesson-board-column .selection-readout')).toHaveCount(0)
})

test('hinted final placement earns the same full-board finale',async({page})=>{
 await page.goto('/')
 const {getDailyPuzzle}=await import('../src/puzzles')
 const date=await page.locator('time').getAttribute('datetime')
 const puzzle=getDailyPuzzle(date!,'beginner'),target=puzzle.givens.indexOf(0)
 await page.evaluate(({puzzle,target})=>{
  const values=[...puzzle.solution];values[target]=0
  localStorage.setItem(`sudoku-game-v1:${puzzle.id}`,JSON.stringify({version:1,puzzleId:puzzle.id,values,selected:target,notes:Array.from({length:81},()=>[]),noteMode:false,rewarded:[],elapsed:0,hintsUsed:0}))
 },{puzzle,target})
 await page.reload()
 await page.getByRole('button',{name:'Hint',exact:true}).click()
 await page.getByRole('button',{name:'Apply this step',exact:true}).click()
 await expect(page.locator('.game-status')).toContainText('Puzzle complete')
 await expect(page.locator('[data-reward-variant="finale"]')).toHaveCount(1)
 const widths=await page.locator('.reward-layer,.reward-layer *').evaluateAll(elements=>elements.flatMap(element=>{const style=getComputedStyle(element);return ['borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth'].map(key=>parseFloat(style[key as keyof CSSStyleDeclaration] as string)||0)}))
 expect(Math.max(...widths)).toBeLessThanOrEqual(1)
})

test('reduced motion suppresses effects while preserving completion status',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'})
 await page.goto('/')
 const {getDailyPuzzle}=await import('../src/puzzles')
 const date=await page.locator('time').getAttribute('datetime')
 const puzzle=getDailyPuzzle(date!,'beginner')
 await page.evaluate(puzzle=>{
  const values=[...puzzle.solution];values[puzzle.givens.indexOf(0)]=0
  const selected=puzzle.givens.indexOf(0)
  localStorage.setItem(`sudoku-game-v1:${puzzle.id}`,JSON.stringify({version:1,puzzleId:puzzle.id,values,selected,notes:Array.from({length:81},()=>[]),noteMode:false,rewarded:[],elapsed:0,hintsUsed:0,past:[],future:[]}))
 },puzzle)
 await page.reload()
 const target=puzzle.givens.indexOf(0)
 await page.locator(`[data-cell="${target}"]`).click();await page.keyboard.press(String(puzzle.solution[target]))
 await expect(page.locator('.game-status')).toContainText('Puzzle complete')
 const effect=page.locator('.reward-layer')
 await expect(effect).toHaveCSS('display','none')
})
