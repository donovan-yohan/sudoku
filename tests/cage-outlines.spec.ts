import {expect,test} from '@playwright/test'
import {readFileSync,mkdirSync} from 'node:fs'
import {createRequire} from 'node:module'
import {getDailyPuzzle,waitForBoard} from './puzzle-fixture'

// Keep the controlled geometry worker fixture out of the offline shell cache.
test.use({serviceWorkers:'block'})

const axe=readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'),'utf8')
const templates=JSON.parse(readFileSync(new URL('../src/variant-seeds.json',import.meta.url),'utf8'))
const template=templates.find((item:{variant:string})=>item.variant==='killer')
const tCells=[1,9,10,11]
const cages=[{cells:tCells,sum:tCells.reduce((sum,cell)=>sum+template.solution[cell],0)},...Array.from({length:81},(_,cell)=>cell).filter(cell=>!tCells.includes(cell)).map(cell=>({cells:[cell],sum:template.solution[cell]}))]

for(const theme of ['light','dark'])test(`Killer cage contours connect through concave corners in ${theme}`,async({page})=>{
 await page.setViewportSize({width:390,height:1000})
 await page.addInitScript(theme=>localStorage.setItem('sudoku-theme',theme),theme)
 // An actual completed witness with singleton sums makes this connected T fixture
 // uniquely solvable, without relying on arbitrary candidate states.
 await page.route('**/*generation.worker*',route=>route.fulfill({contentType:'text/javascript',body:`self.onmessage=({data:r})=>self.postMessage({id:r.id,puzzle:{id:r.id,givens:Array(81).fill(0),solution:${JSON.stringify(template.solution)},difficulty:r.difficulty,variant:'killer',generatorVersion:'v2',techniques:[],cages:${JSON.stringify(cages)}}})`}))
 await page.goto('/');await waitForBoard(page)
 await page.getByLabel('Game mode',{exact:true}).selectOption('killer')
 await waitForBoard(page,/:killer:beginner$/)
 const board=page.getByRole('grid')
 await expect(board.locator('.cage-outlines path[data-cage="0"]')).toHaveCount(1)
 await expect(board.locator('.cage-edge')).toHaveCount(0)
 const outline=board.locator('.cage-outlines path[data-cage="0"]')
 const path=await outline.getAttribute('d')
 expect(path?.match(/M/g)).toHaveLength(1)
 expect(path?.match(/Z/g)).toHaveLength(1)
 for(const coordinate of ['106 106','194 106','294 194','6 194'])expect(path).toContain(coordinate)
 expect(await outline.evaluate(element=>getComputedStyle(element).strokeWidth)).toBe('1px')
 await expect(outline).toHaveAttribute('vector-effect','non-scaling-stroke')
 await expect(board.locator('.cage-outlines')).toHaveAttribute('aria-hidden','true')
 expect(await board.locator('.cage-outlines').evaluate(element=>getComputedStyle(element).pointerEvents)).toBe('none')
 const patterns=await board.locator('.cage-outlines path').evaluateAll(paths=>paths.map(path=>({cage:Number(path.getAttribute('data-cage')),pattern:path.getAttribute('data-pattern')})))
 const ownership=Array(81).fill(-1)
 cages.forEach((cage,index)=>cage.cells.forEach(cell=>ownership[cell]=index))
 for(let cell=0;cell<81;cell++)for(const other of [cell%9<8?cell+1:-1,cell<72?cell+9:-1]){
  if(other<0||ownership[cell]===ownership[other])continue
  expect(patterns.find(p=>p.cage===ownership[cell])?.pattern).not.toBe(patterns.find(p=>p.cage===ownership[other])?.pattern)
 }
 const before=await outline.getAttribute('d')
 const cell=board.locator('[data-cell="10"]')
 await cell.click();await cell.press('3')
 await expect(cell.locator('.cell-value')).toHaveText('3')
 expect(await outline.getAttribute('d')).toBe(before)
 await cell.press('ArrowRight');await expect(board.locator('[data-cell="11"]')).toBeFocused()
 expect(await board.locator('.board-row:last-of-type>.cell').evaluateAll(cells=>cells.map(cell=>getComputedStyle(cell).borderBottomWidth))).toEqual(Array(9).fill('0px'))
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:1000})
  const bounds=await board.boundingBox(),overlay=await board.locator('.cage-outlines').boundingBox()
  expect(Math.abs(bounds!.width-2-overlay!.width)).toBeLessThan(1)
  expect(Math.abs(bounds!.height-2-overlay!.height)).toBeLessThan(1)
  expect(Math.abs(overlay!.x-bounds!.x-1)).toBeLessThan(1)
  expect(Math.abs(overlay!.y-bounds!.y-1)).toBeLessThan(1)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 }
 await page.route('**/__test/axe.js',route=>route.fulfill({contentType:'text/javascript',body:axe}))
 await page.addScriptTag({url:'/__test/axe.js'})
 const violations=await page.evaluate(async()=>(await (window as unknown as {axe:{run:()=>Promise<{violations:unknown[]}>}}).axe.run()).violations)
 expect(violations).toEqual([])
 if(process.env.SUDOKU_EVIDENCE_DIR){
  mkdirSync(process.env.SUDOKU_EVIDENCE_DIR,{recursive:true})
  await page.setViewportSize({width:390,height:1000})
  await page.screenshot({path:`${process.env.SUDOKU_EVIDENCE_DIR}/cages-${theme}.png`,fullPage:true})
 }
})

test('real generated Killer puzzles keep adjacent outlines distinct at every supported difficulty',async({page})=>{
 await page.clock.install({time:new Date('2026-10-21T12:00:00Z')})
 await page.goto('/');await waitForBoard(page)
 await page.getByLabel('Game mode',{exact:true}).selectOption('killer')
 for(const difficulty of ['beginner','intermediate','advanced'] as const){
  await page.getByRole('button',{name:new RegExp(`^${difficulty}$`,'i')}).click()
  await waitForBoard(page,`v3:daily:2026-10-21:killer:${difficulty}`)
  const puzzle=getDailyPuzzle('2026-10-21',difficulty,'killer')
  const paths=await page.locator('.cage-outlines path').evaluateAll(paths=>paths.map(path=>({cage:Number(path.getAttribute('data-cage')),pattern:Number(path.getAttribute('data-pattern')),path:path.getAttribute('d')})))
  expect(paths).toHaveLength(puzzle.cages!.length)
  const owners=Array(81).fill(-1)
  puzzle.cages!.forEach((cage,index)=>cage.cells.forEach(cell=>owners[cell]=index))
  for(const outline of paths)expect(outline.path).toMatch(/^M.*Z$/)
  for(let cell=0;cell<81;cell++)for(const other of [cell%9<8?cell+1:-1,cell<72?cell+9:-1]){
   if(other<0||owners[cell]===owners[other])continue
   expect(paths[owners[cell]].pattern).not.toBe(paths[owners[other]].pattern)
  }
 }
 await page.getByLabel('Game mode',{exact:true}).selectOption('classic')
 await waitForBoard(page,/classic:advanced$/)
 await expect(page.locator('.cage-outlines')).toHaveCount(0)
})
