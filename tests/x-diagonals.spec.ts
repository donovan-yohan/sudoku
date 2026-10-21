import {expect,test,type Locator} from '@playwright/test'
import {waitForBoard} from './puzzle-fixture'

async function expectDiagonalPaint(cell:Locator,theme:'light'|'dark') {
 await expect(cell.locator('.diagonal-marks')).toBeVisible()
 const paint=await cell.evaluate(element=>{
  const svg=element.querySelector<SVGSVGElement>('.diagonal-marks')!
  const line=svg.querySelector('line')!,style=getComputedStyle(line)
  const channels=(color:string)=>color.match(/[\d.]+/g)!.map(Number)
  const background=channels(getComputedStyle(element).backgroundColor),stroke=channels(style.stroke)
  const alpha=(stroke[3]??1)*Number(style.opacity)*Number(getComputedStyle(svg).opacity)
  const composite=stroke.slice(0,3).map((value,i)=>alpha*value+(1-alpha)*background[i])
  const luminance=(rgb:number[])=>rgb.slice(0,3).map(value=>{const n=value/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4}).reduce((sum,value,i)=>sum+value*[.2126,.7152,.0722][i],0)
  const a=luminance(composite),b=luminance(background)
  const bounds=element.getBoundingClientRect(),overlay=svg.getBoundingClientRect()
  return {alpha,stroke,background,contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),
   pointerEvents:getComputedStyle(svg).pointerEvents,position:getComputedStyle(svg).position,
   strokeWidth:style.strokeWidth,vectorEffect:style.vectorEffect,fill:style.fill,
   display:style.display,visibility:style.visibility,borderRadius:getComputedStyle(element).borderRadius,
   geometry:{width:overlay.width,height:overlay.height,cellWidth:bounds.width,cellHeight:bounds.height},
   lines:[...svg.querySelectorAll('line')].map(line=>[line.x1.baseVal.value,line.y1.baseVal.value,line.x2.baseVal.value,line.y2.baseVal.value]),
  }
 })
 expect(paint.alpha).toBeCloseTo(.3)
 expect(paint.stroke.slice(0,3)).toEqual(theme==='light'?[0,0,0]:[255,255,255])
 // Subtle hierarchy marks, not text: test their actual composite against every
 // interactive background rather than applying a text contrast threshold.
 expect(paint.contrast).toBeGreaterThan(1.7)
 expect(paint.contrast).toBeLessThan(4)
 expect(paint.pointerEvents).toBe('none')
 expect(paint.position).toBe('absolute')
 expect(paint.strokeWidth).toBe('1px')
 expect(paint.vectorEffect).toBe('non-scaling-stroke')
 expect(paint.fill).toBe('none')
 expect(paint.display).not.toBe('none')
 expect(paint.visibility).toBe('visible')
 expect(paint.borderRadius).toBe('0px')
 expect(paint.geometry.width).toBeGreaterThan(20)
 expect(Math.abs(paint.geometry.width-paint.geometry.cellWidth)).toBeLessThanOrEqual(1)
 expect(Math.abs(paint.geometry.height-paint.geometry.cellHeight)).toBeLessThanOrEqual(1)
 return paint
}

for(const width of [320,390,1440])for(const theme of ['light','dark'] as const){
 test(`X strokes survive normal, peer, selected, hover and keyboard focus at ${width}px in ${theme}`,async({page},testInfo)=>{
  const errors:string[]=[]
  page.on('pageerror',error=>errors.push(error.message))
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text())})
  await page.setViewportSize({width,height:1000})
  await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'})
  await page.addInitScript(theme=>localStorage.setItem('sudoku-theme',theme),theme)
  await page.goto('/');await waitForBoard(page)
  await page.getByRole('combobox',{name:'Game mode'}).selectOption('x')
  const board=await waitForBoard(page,/:x:beginner$/)
  await expect(board.getByRole('gridcell')).toHaveCount(81)
  await expect(board.locator('.cell.diagonal')).toHaveCount(17)
  await expect(board.locator('.diagonal-marks')).toHaveCount(17)
  await expect(board.locator('.diagonal-marks line')).toHaveCount(18)
  const main=board.locator('[data-cell="30"]'),anti=board.locator('[data-cell="24"]'),center=board.locator('[data-cell="40"]')
  // An off-diagonal selection keeps the distant main/anti cells at rest.
  await board.locator('[data-cell="1"]').click()
  await expect(main).not.toHaveClass(/\bpeer\b/)
  const normal=await expectDiagonalPaint(main,theme)
  expect(normal.lines).toEqual([[0,0,100,100]])
  expect((await expectDiagonalPaint(anti,theme)).lines).toEqual([[100,0,0,100]])
  expect((await expectDiagonalPaint(center,theme)).lines).toEqual([[0,0,100,100],[100,0,0,100]])
  await main.hover()
  const hovered=await expectDiagonalPaint(main,theme)
  expect(hovered.background).not.toEqual(normal.background)
  await main.click();await page.mouse.move(0,0)
  await expect(main).toHaveAttribute('aria-selected','true')
  const selected=await expectDiagonalPaint(main,theme)
  expect(selected.background).not.toEqual(normal.background)
  await main.hover();await expectDiagonalPaint(main,theme)
  await main.press('ArrowDown');await expect(board.locator('[data-cell="39"]')).toBeFocused()
  await page.keyboard.press('ArrowUp');await expect(main).toBeFocused()
  expect(await main.evaluate(element=>element.matches(':focus-visible'))).toBe(true)
  expect(await main.evaluate(element=>getComputedStyle(element).outlineWidth)).toBe('1px')
  await expectDiagonalPaint(main,theme)
  for(const selected of [30,24,40,1]){
   await board.locator(`[data-cell="${selected}"]`).click()
   const actualPeers=await board.locator('.cell.peer').evaluateAll(elements=>elements.map(element=>Number(element.getAttribute('data-cell'))))
   const selectedRow=Math.floor(selected/9),selectedColumn=selected%9
   const expectedPeers=Array.from({length:81},(_,cell)=>cell).filter(cell=>{
    const row=Math.floor(cell/9),column=cell%9
    return row===selectedRow||column===selectedColumn||
     (Math.floor(row/3)===Math.floor(selectedRow/3)&&Math.floor(column/3)===Math.floor(selectedColumn/3))||
     (selectedRow===selectedColumn&&row===column)||
     (selectedRow+selectedColumn===8&&row+column===8)
   })
   expect(actualPeers,`peers of cell ${selected}`).toEqual(expectedPeers)
   if(selected===30){
    const peer=board.locator('[data-cell="80"]')
    await expect(peer).toHaveClass(/\bpeer\b/)
    await expectDiagonalPaint(peer,theme)
   }
  }
  const editable=board.locator('.cell.diagonal[aria-readonly="false"]').first()
  await editable.click();await editable.press('n');await editable.press('2')
  await expect(editable).toHaveAccessibleName(/notes 2/)
  await expect(editable.locator('.cell-notes')).toContainText('2')
  await expect(page.getByRole('button',{name:'Notes',exact:true})).toHaveAttribute('aria-pressed','true')
  await expectDiagonalPaint(editable,theme)
  await editable.press('n');await editable.press('2')
  await expect(editable.locator('.cell-value')).toHaveText('2')
  await expect(editable.locator('.cell-notes')).toHaveCount(0)
  await expectDiagonalPaint(editable,theme)
  await editable.press('Delete');await expect(editable.locator('.cell-value')).toHaveCount(0)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  expect(errors).toEqual([])
  await testInfo.attach(`paint-${width}-${theme}`,{body:JSON.stringify({normal,hovered,selected},null,2),contentType:'application/json'})
  const screenshot=testInfo.outputPath(`x-${width}-${theme}.png`)
  await board.screenshot({path:screenshot})
  await testInfo.attach(`x-${width}-${theme}`,{path:screenshot,contentType:'image/png'})
 })
}
