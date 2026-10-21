import {readFileSync} from 'node:fs'
import {describe,expect,it} from 'vitest'

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8')
describe('Public page metadata',()=>{
 it('uses the straightforward daily title and a task-focused description',()=>{
  expect(html).toContain('<meta property="og:title" content="Daily Sudoku" />')
  expect(html).toContain('<title>Daily Sudoku</title>')
  expect(html).toContain('<meta name="description" content="Daily puzzles and interactive lessons, from your first single to expert techniques. Free, open source, no account needed." />')
  expect(html).not.toContain('A quieter way to Sudoku.')
 })
 it('shares one explicit, accessible landscape image',()=>{
  expect(html).toContain('<meta property="og:image" content="https://sudoku.donovanyohan.com/og-image.png" />')
  expect(html).toContain('<meta property="og:image:width" content="1200" />')
  expect(html).toContain('<meta property="og:image:height" content="630" />')
  expect(html).toContain('<meta property="og:image:alt" content="Daily Sudoku beside a Sudoku puzzle." />')
  expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />')
  const png=readFileSync(new URL('../public/og-image.png',import.meta.url))
  expect(png.subarray(1,4).toString()).toBe('PNG')
  expect(png.readUInt32BE(16)).toBe(1200)
  expect(png.readUInt32BE(20)).toBe(630)
 })
})
