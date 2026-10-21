import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe,expect,it} from 'vitest'
import Board from './components/Board'

function renderBoard(selected=0,variant:'classic'|'x'|'killer'='x') {
 return renderToStaticMarkup(createElement(Board,{
  values:Array(81).fill(0),givens:Array(81).fill(0),notes:Array.from({length:81},()=>[]),
  selected,onSelect:()=>{},label:'Sudoku',variant,
 }))
}
function renderedCells(html:string) {
 return [...html.matchAll(/<button\b[^>]*data-cell="(\d+)"[^>]*>[\s\S]*?<\/button>/g)].map(match=>({cell:Number(match[1]),html:match[0]}))
}

describe('X diagonal peers',()=>{
 it.each([0,10,30,80,8,16,24,72,40,1])('highlights exactly the classic and shared diagonal peers of cell %i',selected=>{
  const selectedRow=Math.floor(selected/9),selectedColumn=selected%9
  for(const {cell,html} of renderedCells(renderBoard(selected))){
   const row=Math.floor(cell/9),column=cell%9
   const classic=selectedRow===row||selectedColumn===column||(
    Math.floor(selectedRow/3)===Math.floor(row/3)&&Math.floor(selectedColumn/3)===Math.floor(column/3))
   const sharedMain=selectedRow===selectedColumn&&row===column
   const sharedAnti=selectedRow+selectedColumn===8&&row+column===8
   expect(/class="[^"]*\bpeer\b/.test(html),`selected ${selected}, cell ${cell}`).toBe(classic||sharedMain||sharedAnti)
  }
 })
 it.each(['classic','killer'] as const)('keeps %s peers classic even when the selection lies on both diagonals',variant=>{
  for(const {cell,html} of renderedCells(renderBoard(40,variant))){
   const row=Math.floor(cell/9),column=cell%9
   expect(/class="[^"]*\bpeer\b/.test(html),`cell ${cell}`).toBe(row===4||column===4||(row>=3&&row<=5&&column>=3&&column<=5))
  }
 })
})

describe('X diagonal marks',()=>{
 it('draws literal corner-to-corner strokes in each diagonal direction, with both at the center',()=>{
  const html=renderBoard(),cells=renderedCells(html)
  expect(cells).toHaveLength(81)
  expect(cells.filter(({html})=>/class="[^"]*\bdiagonal\b/.test(html))).toHaveLength(17)
  for(const {cell,html} of cells){
   const row=Math.floor(cell/9),column=cell%9
   const main=row===column,anti=row+column===8
   const lines=[...html.matchAll(/<line\b[^>]*>/g)].map(match=>match[0])
   expect(lines,`cell ${cell}`).toHaveLength(Number(main)+Number(anti))
   if(main)expect(lines).toContainEqual(expect.stringContaining('x1="0" y1="0" x2="100" y2="100"'))
   if(anti)expect(lines).toContainEqual(expect.stringContaining('x1="100" y1="0" x2="0" y2="100"'))
   for(const line of lines){
    expect(line).toContain('vector-effect="non-scaling-stroke"')
    expect(line).toContain('stroke-width="1"')
   }
   if(main||anti){
    expect(html).toMatch(/<svg[^>]*class="diagonal-marks"[^>]*aria-hidden="true"[^>]*focusable="false"/)
    expect(html).toContain('viewBox="0 0 100 100"')
    expect(html).toContain('preserveAspectRatio="none"')
   }
  }
  expect((html.match(/role="gridcell"/g)||[])).toHaveLength(81)
  expect((html.match(/tabindex="0"/g)||[])).toHaveLength(1)
 })
 it.each(['classic','killer'] as const)('does not add diagonal marks to %s boards',variant=>{
  expect(renderBoard(40,variant)).not.toContain('diagonal-marks')
 })
})
