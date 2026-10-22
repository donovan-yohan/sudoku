import { expect, type Page } from '@playwright/test'
import { generateRequestedPuzzle, generatedDailyRequest, generatedPracticeRequest } from '../src/generated-puzzles'
import type { Difficulty, GameState } from '../src/types'
import type { GameVariant } from '../src/variant-engine'

/** Use exactly the request/seed consumed by the real browser generation worker. */
export function getDailyPuzzle(date: string, difficulty: Difficulty, variant: GameVariant = 'classic') {
  return generateRequestedPuzzle(generatedDailyRequest(date, variant, difficulty))
}
export { generateRequestedPuzzle, generatedDailyRequest, generatedPracticeRequest }

/** Install on the next document before React starts, never against a live tick writer. */
export async function installGameOnNextLoad(page: Page, state: GameState) {
  await page.addInitScript(state => {
    const marker = `test-fixture-installed:${state.puzzleId}`
    if (localStorage.getItem(marker)) return
    localStorage.setItem(`sudoku-game-v2:${state.puzzleId}`, JSON.stringify(state))
    localStorage.setItem(marker, 'yes')
  }, state)
}

/** Loading unmounts the board: an empty locator snapshot is not a puzzle. */
export async function waitForBoard(page: Page, identity: string | RegExp = /^v3:/) {
  const column = page.locator('.board-column')
  await expect(column).toHaveAttribute('data-puzzle-id', identity, { timeout: 20_000 })
  await expect(column.getByRole('gridcell')).toHaveCount(81)
  await expect(page.locator('.generation-status')).toHaveCount(0)
  return column.getByRole('grid')
}

/** React persists only after generation settles; reload must not race that effect. */
export async function waitForSavedSession(page: Page) {
  const id = await page.locator('.board-column').getAttribute('data-puzzle-id')
  await expect.poll(() => page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem('sudoku-session-v2') || 'null')
    if (!session) return null
    const variant = session.variant || 'classic'
    if (session.generator !== 'v3') return null
    const seed = variant === 'classic' ? session.practiceSeeds[session.difficulty] : session.variantPracticeSeeds?.[variant]?.[session.difficulty]
    return `v3:${session.mode}:${session.mode === 'daily' ? session.dailyDate : seed}:${variant}:${session.difficulty}`
  })).toBe(id)
}

export async function waitForSavedGame(page: Page) {
  const id = await page.locator('.board-column').getAttribute('data-puzzle-id')
  const cells = await page.locator('.board-column').getByRole('gridcell').evaluateAll(elements => elements.map(element => ({
    value: Number(element.querySelector('.cell-value')?.textContent || 0),
    notes: element.getAttribute('aria-label')?.match(/, notes ([1-9](?:, [1-9])*)/)?.[1].split(', ').map(Number) || [],
  })))
  expect(cells).toHaveLength(81)
  await expect.poll(() => page.evaluate(id => {
    const game = JSON.parse(localStorage.getItem(`sudoku-game-v2:${id}`) || 'null')
    return game ? game.values.map((value: number, cell: number) => ({ value, notes: game.notes[cell] })) : null
  }, id)).toEqual(cells)
  await waitForSavedSession(page)
}
