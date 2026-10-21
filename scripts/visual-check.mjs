import {chromium} from '@playwright/test'
import {mkdir} from 'node:fs/promises'
const origin=process.env.SUDOKU_URL||'http://127.0.0.1:5175'
const out=process.env.SUDOKU_EVIDENCE_DIR || './test-results/visual'
await mkdir(out,{recursive:true})
const browser=await chromium.launch()
for(const [name,width,height,scheme] of [['desktop-light',1440,1050,'light'],['phone-dark',390,844,'dark']]){
 const page=await browser.newPage({viewport:{width,height},colorScheme:scheme})
 const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto(origin);await page.waitForSelector('[role=gridcell]')
 await page.screenshot({path:out+'/'+name+'.png',fullPage:true})
 console.log(JSON.stringify({name,errors,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),cells:await page.locator('[role=gridcell]').count(),screenshot:out+'/'+name+'.png'}))
 await page.close()
}
await browser.close()
