import { expect, test, type Page } from '@playwright/test'
import { getDailyPuzzle, generateRequestedPuzzle, generatedPracticeRequest, waitForBoard, waitForSavedGame } from './puzzle-fixture'
import { getDailyPuzzle as getLegacyDailyPuzzle } from '../src/puzzles'
import { createGame } from '../src/game'
import type { Difficulty } from '../src/types'
import type { GameVariant } from '../src/variant-engine'

const date = '2026-01-15'
const variants: GameVariant[] = ['classic', 'x', 'killer']
const levels = (variant: GameVariant): Difficulty[] => variant === 'classic' ? ['beginner', 'intermediate', 'advanced', 'expert'] : ['beginner', 'intermediate', 'advanced']
const title = (level: string) => level[0].toUpperCase() + level.slice(1)
async function snapshot(page: Page) {
  return page.getByRole('gridcell').evaluateAll(cells => cells.map(cell => ({
    value: Number(cell.querySelector('.cell-value')?.textContent || 0),
    label: cell.getAttribute('aria-label'),
    cage: cell.getAttribute('data-cage'),
    total: cell.querySelector('.cage-total')?.textContent || null,
  })))
}
async function expectGivens(page: Page, givens: number[]) {
  expect(await page.getByRole('gridcell').evaluateAll(cells => cells.map(cell => Number(cell.querySelector('.cell-value')?.textContent || 0)))).toEqual(givens)
}

for (const variant of variants) test(`actual worker preserves distinct daily and practice saves for every ${variant} difficulty`, async ({ page }) => {
  test.setTimeout(90_000)
  await page.clock.install({ time: new Date('2026-10-21T12:00:00Z') })
  const workers: string[] = []
  page.on('worker', worker => workers.push(worker.url()))
  await page.goto('/'); await waitForBoard(page, 'v2:daily:2026-10-21:classic:beginner')
  await page.getByLabel('Game mode', { exact: true }).selectOption(variant)
  await waitForBoard(page, `v2:daily:2026-10-21:${variant}:beginner`)
  await page.getByLabel('Puzzle date', { exact: true }).fill(date)
  await waitForBoard(page, `v2:daily:${date}:${variant}:beginner`)
  await expect(page.getByRole('group', { name: 'Difficulty', exact: true }).getByRole('button')).toHaveCount(levels(variant).length)
  if (variant !== 'classic') await expect(page.getByRole('button', { name: 'Expert', exact: true })).toHaveCount(0)
  const daily = new Map<Difficulty, Awaited<ReturnType<typeof snapshot>>>()
  const practice = new Map<Difficulty, { id: string; position: Awaited<ReturnType<typeof snapshot>> }>()
  for (const level of levels(variant)) {
    await page.getByRole('button', { name: title(level), exact: true }).click()
    await waitForBoard(page, `v2:daily:${date}:${variant}:${level}`)
    await expectGivens(page, getDailyPuzzle(date, level, variant).givens)
    const cell = page.getByRole('gridcell', { name: /empty/ }).first()
    await cell.click(); await cell.press('n'); await cell.press('3')
    await expect(cell).toHaveAccessibleName(/notes 3/)
    await waitForSavedGame(page)
    daily.set(level, await snapshot(page))
  }
  await page.getByRole('button', { name: 'Practice', exact: true }).click()
  await waitForBoard(page, new RegExp(`^v2:practice:.*:${variant}:${levels(variant).at(-1)}$`))
  for (const level of levels(variant)) {
    await page.getByRole('button', { name: title(level), exact: true }).click()
    await waitForBoard(page, new RegExp(`^v2:practice:.*:${variant}:${level}$`))
    const id = (await page.locator('.board-column').getAttribute('data-puzzle-id'))!
    const seed = id.slice('v2:practice:'.length, -`:${variant}:${level}`.length)
    await expectGivens(page, generateRequestedPuzzle(generatedPracticeRequest(seed, variant, level)).givens)
    const cell = page.getByRole('gridcell', { name: /empty/ }).first()
    await cell.click(); await cell.press('n'); await cell.press('6')
    await expect(cell).toHaveAccessibleName(/notes 6/)
    await waitForSavedGame(page)
    practice.set(level, { id, position: await snapshot(page) })
  }
  expect(new Set([...practice.values()].map(item => item.id)).size).toBe(levels(variant).length)
  await page.reload(); await waitForBoard(page, practice.get(levels(variant).at(-1)!)!.id)
  for (const level of levels(variant)) {
    await page.getByRole('button', { name: title(level), exact: true }).click()
    await waitForBoard(page, practice.get(level)!.id)
    expect(await snapshot(page)).toEqual(practice.get(level)!.position)
  }
  await page.getByRole('button', { name: 'Daily', exact: true }).click()
  await waitForBoard(page, `v2:daily:${date}:${variant}:${levels(variant).at(-1)}`)
  for (const level of levels(variant)) {
    await page.getByRole('button', { name: title(level), exact: true }).click()
    await waitForBoard(page, `v2:daily:${date}:${variant}:${level}`)
    expect(await snapshot(page)).toEqual(daily.get(level))
  }
  expect(workers.some(url => url.includes('generation.worker'))).toBe(true)
})

test('switching variants keeps each practice seed and daily edit isolated in one session', async ({ page }) => {
  test.setTimeout(90_000)
  await page.clock.install({ time: new Date('2026-10-21T12:00:00Z') })
  await page.goto('/'); await waitForBoard(page, 'v2:daily:2026-10-21:classic:beginner')
  const saved = new Map<GameVariant, { daily: Awaited<ReturnType<typeof snapshot>>; practice: Awaited<ReturnType<typeof snapshot>>; id: string }>()
  for (const variant of variants) {
    await page.getByLabel('Game mode', { exact: true }).selectOption(variant)
    await waitForBoard(page, `v2:daily:2026-10-21:${variant}:beginner`)
    const dailyCell = page.getByRole('gridcell', { name: /empty/ }).first()
    await dailyCell.click(); await dailyCell.press('n'); await dailyCell.press('2')
    await expect(dailyCell).toHaveAccessibleName(/notes 2/)
    await waitForSavedGame(page)
    const daily = await snapshot(page)
    await page.getByRole('button', { name: 'Practice', exact: true }).click()
    await waitForBoard(page, new RegExp(`^v2:practice:.*:${variant}:beginner$`))
    const practiceCell = page.getByRole('gridcell', { name: /empty/ }).first()
    await practiceCell.click(); await practiceCell.press('n'); await practiceCell.press('8')
    await expect(practiceCell).toHaveAccessibleName(/notes 8/)
    await waitForSavedGame(page)
    saved.set(variant, { daily, practice: await snapshot(page), id: (await page.locator('.board-column').getAttribute('data-puzzle-id'))! })
    await page.getByRole('button', { name: 'Daily', exact: true }).click()
    await waitForBoard(page, `v2:daily:2026-10-21:${variant}:beginner`)
    expect(await snapshot(page)).toEqual(daily)
  }
  await waitForSavedGame(page); await page.reload(); await waitForBoard(page, 'v2:daily:2026-10-21:killer:beginner')
  for (const variant of variants) {
    await page.getByLabel('Game mode', { exact: true }).selectOption(variant)
    await waitForBoard(page, `v2:daily:2026-10-21:${variant}:beginner`)
    expect(await snapshot(page)).toEqual(saved.get(variant)!.daily)
    await page.getByRole('button', { name: 'Practice', exact: true }).click()
    await waitForBoard(page, saved.get(variant)!.id)
    expect(await snapshot(page)).toEqual(saved.get(variant)!.practice)
    await page.getByRole('button', { name: 'Daily', exact: true }).click()
    await waitForBoard(page, `v2:daily:2026-10-21:${variant}:beginner`)
  }
})

for (const variant of variants) test(`fresh ${variant} beginner uses the real worker and generous starting structure`, async ({ page }) => {
  await page.goto('/'); await waitForBoard(page)
  const today = await page.locator('time').getAttribute('datetime')
  await page.getByLabel('Game mode', { exact: true }).selectOption(variant)
  await waitForBoard(page, `v2:daily:${today}:${variant}:beginner`)
  await expect(page.locator('.cell.given')).toHaveCount(variant === 'killer' ? 0 : 45)
  await page.getByRole('button', { name: 'Practice', exact: true }).click()
  await waitForBoard(page, new RegExp(`^v2:practice:.*:${variant}:beginner$`))
  const beforeId = await page.locator('.board-column').getAttribute('data-puzzle-id')
  const before = await snapshot(page)
  await page.getByRole('button', { name: 'New practice puzzle', exact: true }).click()
  await waitForBoard(page, new RegExp(`^v2:practice:.*:${variant}:beginner$`))
  await expect(page.locator('.board-column')).not.toHaveAttribute('data-puzzle-id', beforeId!)
  await expect(page.locator('.cell.given')).toHaveCount(variant === 'killer' ? 0 : 45)
  expect(await snapshot(page)).not.toEqual(before)
  if (variant === 'x') await expect(page.locator('.cell.diagonal')).toHaveCount(17)
  if (variant === 'killer') expect((await snapshot(page)).every(cell => cell.cage !== null)).toBe(true)
  await waitForSavedGame(page)
  const afterId = (await page.locator('.board-column').getAttribute('data-puzzle-id'))!
  const after = await snapshot(page)
  await page.reload(); await waitForBoard(page, afterId)
  expect(await snapshot(page)).toEqual(after)
})

test('same UTC seed produces exactly matching worker boards across isolated timezone contexts', async ({ browser, baseURL }) => {
  test.setTimeout(60_000)
  const contexts = await Promise.all(['Pacific/Honolulu', 'Asia/Tokyo'].map(timezoneId => browser.newContext({ baseURL, timezoneId })))
  try {
    const pages = await Promise.all(contexts.map(context => context.newPage()))
    await Promise.all(pages.map(async page => {
      await page.clock.install({ time: new Date('2026-10-21T00:30:00Z') })
      await page.goto('/'); await waitForBoard(page, 'v2:daily:2026-10-21:classic:beginner')
    }))
    for (const variant of variants) {
      await Promise.all(pages.map(async page => {
        await page.getByLabel('Game mode', { exact: true }).selectOption(variant)
        await waitForBoard(page, `v2:daily:2026-10-21:${variant}:beginner`)
        await expect(page.getByLabel('Puzzle date', { exact: true })).toHaveValue('2026-10-21')
        await expectGivens(page, getDailyPuzzle('2026-10-21', 'beginner', variant).givens)
      }))
      expect(await snapshot(pages[0])).toEqual(await snapshot(pages[1]))
    }
  } finally { await Promise.all(contexts.map(context => context.close())) }
})

test('rapid mode date and difficulty navigation cancels actual workers and the last selection wins', async ({ page }) => {
  await page.addInitScript(() => {
    const Original = window.Worker
    const records: { id: string; received: boolean; terminated: boolean }[] = []
    Object.assign(window, { generationRecords: records })
    window.Worker = class extends Original {
      record?: typeof records[number]
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options)
        this.addEventListener('message', () => { if (this.record) this.record.received = true })
      }
      postMessage(message: { id: string }) {
        this.record = { id: message.id, received: false, terminated: false }; records.push(this.record)
        super.postMessage(message)
      }
      terminate() { if (this.record) this.record.terminated = true; super.terminate() }
    }
  })
  await page.goto('/'); await waitForBoard(page)
  await page.getByRole('button', { name: 'Advanced', exact: true }).click()
  await page.getByLabel('Puzzle date', { exact: true }).fill('2026-01-11')
  await page.getByLabel('Game mode', { exact: true }).selectOption('x')
  await page.getByLabel('Puzzle date', { exact: true }).fill('2026-01-12')
  await page.getByLabel('Game mode', { exact: true }).selectOption('killer')
  await page.getByLabel('Game mode', { exact: true }).selectOption('classic')
  await page.getByRole('button', { name: 'Beginner', exact: true }).click()
  const id = 'v2:daily:2026-01-12:classic:beginner'
  await waitForBoard(page, id)
  await expectGivens(page, getDailyPuzzle('2026-01-12', 'beginner').givens)
  await expect.poll(() => page.evaluate(() => (window as unknown as { generationRecords: { terminated: boolean }[] }).generationRecords.every(record => record.terminated))).toBe(true)
  const records = await page.evaluate(() => (window as unknown as { generationRecords: { id: string; received: boolean; terminated: boolean }[] }).generationRecords)
  expect(records.at(-1)?.id).toBe(id)
  expect(records.some(record => record.terminated && !record.received)).toBe(true)
  const settled = await snapshot(page)
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await waitForBoard(page, id)
  expect(await snapshot(page)).toEqual(settled)
  await waitForSavedGame(page)
  await page.reload(); await waitForBoard(page, id)
  expect(await snapshot(page)).toEqual(settled)
})

test('valid legacy v1 daily progress remains accessible through navigation and reload', async ({ page }) => {
  const legacy = getLegacyDailyPuzzle(date, 'beginner')
  const state = createGame(legacy)
  const target = legacy.givens.indexOf(0)
  state.notes[target] = [2, 6]; state.selected = target; state.noteMode = true
  await page.clock.install({ time: new Date('2026-10-21T12:00:00Z') })
  await page.addInitScript(({ state, date }) => {
    if (localStorage.getItem('legacy-fixture-installed')) return
    localStorage.setItem('sudoku-session-v1', JSON.stringify({ version: 1, mode: 'daily', dailyDate: date, difficulty: 'beginner', practiceSeeds: {} }))
    localStorage.setItem(`sudoku-game-v1:${state.puzzleId}`, JSON.stringify(state))
    localStorage.setItem('legacy-fixture-installed', 'yes')
  }, { state, date })
  await page.goto('/'); await waitForBoard(page, legacy.id)
  await expect(page.locator(`[data-cell="${target}"]`)).toHaveAccessibleName(/notes 2, 6/)
  const before = await snapshot(page)
  await page.getByRole('button', { name: 'Next day', exact: true }).click(); await waitForBoard(page, 'v2:daily:2026-01-16:classic:beginner')
  await page.getByRole('button', { name: 'Previous day', exact: true }).click(); await waitForBoard(page, legacy.id)
  expect(await snapshot(page)).toEqual(before)
  await page.getByRole('button', { name: 'Learn', exact: true }).click()
  await page.getByRole('button', { name: 'Daily', exact: true }).click(); await waitForBoard(page, legacy.id)
  expect(await snapshot(page)).toEqual(before)
  // Legacy resumes can be stored in a v2 navigation session without rewriting the save itself.
  await page.reload(); await waitForBoard(page, legacy.id)
  expect(await snapshot(page)).toEqual(before)
  expect(await page.evaluate(id => JSON.parse(localStorage.getItem(`sudoku-game-v1:${id}`)!).notes, legacy.id)).toEqual(state.notes)
})
