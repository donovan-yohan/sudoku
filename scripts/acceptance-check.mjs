import {chromium} from '@playwright/test'
import {mkdir} from 'node:fs/promises'
import assert from 'node:assert/strict'
import {enumerate} from './independent-oracle.mjs'
const out=process.env.SUDOKU_EVIDENCE_DIR || './test-results/acceptance'
const origin=process.env.SUDOKU_URL || 'http://127.0.0.1:5175'
await mkdir(out,{recursive:true})
const browser=await chromium.launch()
const results=[]
for(const width of [320,390,768,1440])for(const theme of ['light','dark']){
 const context=await browser.newContext({viewport:{width,height:900},colorScheme:theme,hasTouch:width<400})
 const page=await context.newPage(),errors=[],external=[]
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(origin)&&!r.url().startsWith('data:'))external.push(r.url())})
 await page.goto(origin);await page.waitForSelector('[role=gridcell]')
 for(const level of ['Beginner','Intermediate','Advanced','Expert']){
  await page.getByRole('button',{name:level,exact:true}).click()
  await page.waitForSelector('[role=gridcell]')
  assert.equal(await page.locator('[role=gridcell]').count(),81)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width} ${theme} ${level} overflow`)
 }
 const palette=await page.evaluate(()=>({bg:getComputedStyle(document.documentElement).backgroundColor,fg:getComputedStyle(document.documentElement).color,radii:[...document.querySelectorAll('button')].filter(b=>getComputedStyle(b).borderRadius!=='0px').length}))
 assert.equal(palette.bg,theme==='dark'?'rgb(0, 0, 0)':'rgb(255, 255, 255)');assert.equal(palette.radii,0)
 await page.getByRole('button',{name:'Learn',exact:true}).click()
 assert.equal(await page.locator('.lesson-link').count(),8)
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
 await page.locator('.lesson-link').last().click()
 await page.getByRole('grid').scrollIntoViewIfNeeded()
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
 await page.screenshot({path:`${out}/lesson-${width}-${theme}.png`,fullPage:true})
 assert.deepEqual(errors,[]);assert.deepEqual(external,[])
 results.push({width,theme,levels:4,lessons:8,overflow:false,errors,external,palette})
 await context.close()
}
// Exercise actual number entry, completion progression and the full-board finale.
const page=await browser.newPage({viewport:{width:1200,height:1000}})
await page.goto(origin);await page.waitForSelector('[role=gridcell]')
const givens=await page.locator('[role=gridcell]').evaluateAll(cells=>cells.map(c=>Number(c.textContent)||0))
const solution=enumerate(givens,null,1).first;assert(solution)
const variants=new Set();let chromatic=false
for(let cell=0;cell<81;cell++)if(!givens[cell]){
 const element=page.locator(`[data-cell="${cell}"]`);await element.click();await element.press(String(solution[cell]))
 const reward=page.locator('[data-reward-variant]')
 if(await reward.count()){
  variants.add(await reward.getAttribute('data-reward-variant'))
  if((await reward.getAttribute('class')).includes('chromatic'))chromatic=true
 }
}
assert(variants.size>=4);assert(chromatic)
await page.waitForSelector('[data-reward-variant="finale"]')
await page.screenshot({path:out+'/finale.png',fullPage:true})
assert.match(await page.locator('.game-status').textContent(),/Puzzle complete/)
await page.reload();assert.equal(await page.locator('[data-reward-variant]').count(),0)
await page.emulateMedia({reducedMotion:'reduce'})
assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true)
results.push({actualEntrySolve:true,variants:[...variants],chromatic,reloadDoesNotReplay:true})
console.log(JSON.stringify(results,null,2))
await browser.close()
