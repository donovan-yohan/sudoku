import {expect,test} from '@playwright/test'
import {readFileSync} from 'node:fs'
import type {PracticalLesson} from '../src/practical-lessons'

const lessons=JSON.parse(readFileSync(new URL('../src/practical-lesson-data.json',import.meta.url),'utf8')) as PracticalLesson[]

test('hidden singles show the complete supporting unit, not just the answer cell',async({page})=>{
 await page.goto('/')
 await expect(page.getByRole('gridcell')).toHaveCount(81)
 await page.getByRole('button',{name:'Learn',exact:true}).click()
 await page.getByRole('button',{name:/^Hidden single.*Not started/}).click()
 const lesson=lessons.find(lesson=>lesson.id==='hidden-single')!
 for(let example=0;example<lesson.scenarios.length;example++){
  await page.getByRole('button',{name:`Example ${example+1}`,exact:true}).click()
  const scenario=lesson.scenarios[example]
  for(const cell of scenario.evidence.filter(cell=>!scenario.board[cell])){
   const marks=await page.locator(`[data-cell="${cell}"] .cell-notes span`).allTextContents()
   expect(marks.map(Number).filter(Boolean)).toEqual(scenario.candidates[cell])
  }
  await expect(page.locator(`[data-cell="${scenario.target}"] .cell-notes span`)).toHaveCount(9)
 }
})

test('unrelated lesson cells stay quiet until selected for candidate inspection',async({page})=>{
 await page.goto('/')
 await expect(page.getByRole('gridcell')).toHaveCount(81)
 await page.getByRole('button',{name:'Learn',exact:true}).click()
 await page.getByRole('button',{name:/^Naked triple.*Not started/}).click()
 const scenario=lessons.find(lesson=>lesson.id==='naked-triple')!.scenarios[0]
 const relevant=new Set([...scenario.evidence,...scenario.steps.flatMap(step=>[...step.cells,...step.placements.map(item=>item.cell),...step.eliminations.map(item=>item.cell)])])
 const cell=scenario.board.findIndex((value,cell)=>!value&&!relevant.has(cell))
 const target=page.locator(`[data-cell="${cell}"]`)
 await expect(target).not.toHaveAccessibleName(/candidates/)
 await expect(target.locator('.cell-notes')).toHaveCount(0)
 await target.click()
 await expect(target).toHaveAccessibleName(new RegExp(`candidates ${scenario.candidates[cell].join(', ')}`))
 await expect(target.locator('.cell-notes')).toHaveCount(0)
})
