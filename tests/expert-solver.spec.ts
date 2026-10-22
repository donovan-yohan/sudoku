import { expect, test } from '@playwright/test'
import { createGame } from '../src/game'
import { solveVariant } from '../src/variant-engine'
import { requestVariantHint } from '../src/variant-hints'
import { waitForBoard, waitForSavedGame } from './puzzle-fixture'
import type { Puzzle } from '../src/types'
import bank from '../src/variant-seeds.json' with { type: 'json' }

test.use({ serviceWorkers: 'block' })
const givens = [...'700090650910000000000206040000900207049002000000080000100670000800305000000000008'].map(Number)
const solution = solveVariant(givens, { variant: 'classic' }).first!
const date = '2026-10-21'

test('new expert repertoire explains and applies a real hidden triple without changing player notes', async ({ page }) => {
  const fixture: Puzzle = { id: `v3:daily:${date}:classic:expert`, givens, solution, difficulty: 'expert', variant: 'classic', techniques: ['hidden-triple'] }
  const state = createGame(fixture)
  // Advance by genuine visible placements. No authored or solution-derived domains.
  for (let i = 0; i < 34; i++) {
    const hint = requestVariantHint(state.values, { variant: 'classic' }).deduction!
    expect(hint.placements.length).toBe(1)
    for (const action of hint.placements) state.values[action.cell] = action.digit
  }
  expect(requestVariantHint(state.values, { variant: 'classic' }).deduction?.technique).toBe('hidden-triple')
  state.notes[60] = [3, 4, 5, 9]
  await page.clock.install({ time: new Date(`${date}T12:00:00Z`) })
  await page.addInitScript(({ state, date }) => {
    localStorage.setItem('sudoku-session-v2', JSON.stringify({ version: 1, generator: 'v3', variant: 'classic', mode: 'daily', dailyDate: date, difficulty: 'expert', practiceSeeds: {} }))
    localStorage.setItem(`sudoku-game-v2:${state.puzzleId}`, JSON.stringify(state))
  }, { state, date })
  await page.route('**/*generation.worker*', route => route.fulfill({ contentType: 'text/javascript', body: `self.onmessage=e=>self.postMessage({id:e.data.id,puzzle:{...${JSON.stringify(fixture)},id:e.data.id}})` }))
  await page.goto('/'); await waitForBoard(page, fixture.id)
  const before = await page.getByRole('gridcell').evaluateAll(cells => cells.map(cell => cell.querySelector('.cell-value')?.textContent ?? ''))
  await page.getByRole('button', { name: 'Hint', exact: true }).click()
  const detail = page.getByRole('region', { name: 'Hint details' })
  await expect(detail).toContainText('hidden triple')
  await expect(detail).toContainText('r7c7')
  await expect(detail).toContainText('Remove 9 from r7c7.')
  await page.getByRole('button', { name: 'Apply this step' }).click()
  await expect(page.locator('[data-cell="60"]')).toHaveAccessibleName(/notes 3, 4, 5, 9/)
  expect(await page.getByRole('gridcell').evaluateAll(cells => cells.map(cell => cell.querySelector('.cell-value')?.textContent ?? ''))).toEqual(before)
  await page.getByRole('button', { name: 'Next hint', exact: true }).click()
  await expect(detail).not.toContainText('hidden triple')
  await expect(detail).not.toContainText('No hint available')
  await waitForSavedGame(page)
})

test('a full original expert puzzle reaches and applies a checked inference chain through real hints', async ({ page }) => {
  test.setTimeout(60_000)
  const source = bank.find(puzzle => puzzle.id === 'original-expert-search:23841:2')!
  const fixture: Puzzle = { id: `v3:daily:${date}:classic:expert`, givens: source.givens, solution: source.solution, difficulty: 'expert', variant: 'classic', techniques: source.certification.techniques }
  await page.clock.install({ time: new Date(`${date}T12:00:00Z`) })
  await page.addInitScript(date => localStorage.setItem('sudoku-session-v2', JSON.stringify({ version: 1, generator: 'v3', variant: 'classic', mode: 'daily', dailyDate: date, difficulty: 'expert', practiceSeeds: {} })), date)
  await page.route('**/*generation.worker*', route => route.fulfill({ contentType: 'text/javascript', body: `self.onmessage=e=>self.postMessage({id:e.data.id,puzzle:{...${JSON.stringify(fixture)},id:e.data.id}})` }))
  await page.goto('/'); await waitForBoard(page, fixture.id)
  let sawChain = false
  for (let step = 0; step < 120; step++) {
    const next = page.getByRole('button', { name: 'Next hint', exact: true })
    if (await next.isVisible()) await next.click()
    else await page.getByRole('button', { name: 'Hint', exact: true }).click()
    const detail = page.getByRole('region', { name: 'Hint details' })
    await expect(detail).not.toContainText('No hint available')
    const name = await detail.locator('.eyebrow').innerText()
    if (name.toLowerCase() === 'aic') {
      sawChain = true
      await expect(detail).toContainText('Alternating Inference Chain')
      await expect(detail).toContainText('strong link')
      await expect(detail).toContainText('weak link')
      await expect(detail).toContainText('endpoints')
    }
    await page.getByRole('button', { name: 'Apply this step', exact: true }).click()
    const values = await page.getByRole('gridcell').evaluateAll(cells => cells.map(cell => Number(cell.querySelector('.cell-value')?.textContent ?? 0)))
    if (values.every((value, cell) => value === fixture.solution[cell])) break
  }
  expect(sawChain).toBe(true)
  await expect(page.locator('.complete-status')).toHaveText('Puzzle complete.')
  await waitForSavedGame(page)
})
