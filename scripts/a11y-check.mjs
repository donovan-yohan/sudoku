import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
import {enumerate} from './independent-oracle.mjs'
const browser=await chromium.launch(),origin=process.env.SUDOKU_URL||'http://127.0.0.1:5175'
const results=[]
for(const theme of ['light','dark']){
 const page=await browser.newPage({viewport:{width:390,height:844},colorScheme:theme,bypassCSP:true})
 await page.goto(origin);await page.waitForSelector('[role=gridcell]')
 for(const view of ['play','settings','mistakes','learn','lesson']){
  if(view==='settings')await page.getByRole('button',{name:'Settings',exact:true}).click()
  if(view==='mistakes'){
   await page.getByRole('checkbox',{name:'Show mistakes',exact:true}).check()
   await page.keyboard.press('Escape')
   const values=await page.getByRole('grid').getByRole('gridcell').evaluateAll(cells=>cells.map(cell=>Number(cell.textContent)||0))
   const solution=enumerate(values,null,1).first;assert(solution)
   const target=values.indexOf(0),wrong=solution[target]===9?1:solution[target]+1
   const cell=page.getByRole('grid').getByRole('gridcell',{name:/empty/}).first()
   await cell.click();await cell.press(String(wrong))
  }
  if(view==='learn')await page.getByRole('button',{name:'Learn',exact:true}).click()
  if(view==='lesson')await page.locator('.lesson-link').last().click()
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'})
  const result=await page.evaluate(async()=>await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']}}))
  const violations=result.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.slice(0,3).map(n=>({target:n.target,summary:n.failureSummary})),nodeCount:v.nodes.length}))
  console.log(JSON.stringify({theme,view,violations},null,2));results.push({theme,view,violations})
 }
 await page.close()
}
await browser.close()
assert(results.every(r=>!r.violations.some(v=>v.impact==='critical'||v.impact==='serious')),'Serious accessibility violations')
