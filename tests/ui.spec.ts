import { expect, test, type Locator } from '@playwright/test'
import { waitForBoard, waitForSavedGame, waitForSavedSession, installGameOnNextLoad } from './puzzle-fixture'
import { readFileSync } from 'node:fs'
import type { PracticalLesson, PracticalScenario } from '../src/practical-lessons'

const PRACTICAL_LESSONS = JSON.parse(readFileSync(new URL('../src/practical-lesson-data.json', import.meta.url), 'utf8')) as PracticalLesson[]
const coordinate = (cell: number) => `r${Math.floor(cell / 9) + 1}c${cell % 9 + 1}`
async function walkthroughPosition(board: Locator) {
  return board.getByRole('gridcell').evaluateAll(cells => cells.map(cell => ({
    value: Number(cell.querySelector('.cell-value')?.textContent || 0),
    candidates: cell.getAttribute('aria-label')?.match(/, candidates ([1-9](?:, [1-9])*)/)?.[1].split(', ').map(Number) || [],
  })))
}

async function projectedPosition(board: Locator, position: { value: number; candidates: number[] }[], scenario: PracticalScenario) {
  const selected = Number(await board.locator('[aria-selected="true"]').getAttribute('data-cell'))
  const relevant = new Set([...scenario.evidence, ...scenario.steps.flatMap(step => [...step.cells, ...step.placements.map(item => item.cell), ...step.eliminations.map(item => item.cell)])])
  for (const step of scenario.steps) if (step.xWing) for (let cell = 0; cell < 81; cell++) {
    if (step.xWing.rows.includes(Math.floor(cell / 9)) || step.xWing.columns.includes(cell % 9)) relevant.add(cell)
  }
  return position.map((entry, cell) => ({ value: entry.value, candidates: relevant.has(cell) || cell === selected ? entry.candidates : [] }))
}

test('daily board supports keyboard entry, notes and history without stealing toolbar keys', async ({ page }) => {
  await page.goto('/'); await waitForBoard(page)
  await expect(page.getByRole('grid', { name: 'Daily Sudoku' })).toBeVisible()
  const board = page.getByRole('grid', { name: 'Daily Sudoku' })
  await expect(board.getByRole('row')).toHaveCount(9)
  await expect(board.getByRole('gridcell')).toHaveCount(81)
  const empty = board.getByRole('gridcell', { name: /empty/ }).first()
  const index = await empty.getAttribute('data-cell')
  const cell = board.locator(`[data-cell="${index}"]`)
  await cell.click(); await cell.press('4')
  await expect(cell).toHaveAccessibleName(/entry 4/)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(cell).toHaveAccessibleName(/empty/)
  await page.getByRole('button', { name: 'Redo', exact: true }).click()
  await expect(cell).toHaveAccessibleName(/entry 4/)
  await cell.click(); await cell.press('Backspace'); await cell.press('n'); await cell.press('2')
  await expect(cell).toHaveAccessibleName(/notes 2/)
  await page.getByRole('button', { name: 'Notes', exact: true }).focus()
  await page.keyboard.press('3')
  await expect(cell).toHaveAccessibleName(/notes 2/)
  await page.getByRole('button', { name: 'Learn', exact: true }).click()
  await page.getByRole('button', { name: 'Daily', exact: true }).click()
  await expect(board.locator(`[data-cell="${index}"]`)).toHaveAccessibleName(/notes 2/)
  await waitForSavedGame(page); await page.reload(); await waitForBoard(page)
  await expect(page.getByRole('grid', { name: 'Daily Sudoku' }).locator(`[data-cell="${index}"]`)).toHaveAccessibleName(/notes 2/)
})

test('hints explain before applying, dialogs trap focus and Escape restores it', async ({ page }) => {
  await page.goto('/'); await waitForBoard(page)
  const board = page.getByRole('grid', { name: 'Daily Sudoku' })
  const before = await board.locator('.cell-value').allTextContents()
  await page.getByRole('button', { name: 'Hint', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Apply this step' })).toBeVisible()
  expect(await board.locator('.cell-value').allTextContents()).toEqual(before)
  await page.getByRole('button', { name: 'Apply this step' }).click()
  await expect(page.locator('.game-status')).toContainText('Explained placement applied. You can undo it.')
  await page.getByRole('button', { name: 'Restart puzzle' }).click()
  const dialog = page.getByRole('dialog', { name: 'Start this puzzle again?' })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Shift+Tab')
  await expect(dialog.getByRole('button', { name: 'Clear entries and notes' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Keep playing' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Restart puzzle' })).toBeFocused()
  await page.getByRole('button', { name: 'Help', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'A few simple rules.' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Help', exact: true })).toBeFocused()
})

test('walkthroughs project relevant candidates and preserve full selected-cell inspection', async ({ page }) => {
  const lesson = PRACTICAL_LESSONS.find(lesson => lesson.id === 'naked-triple')!
  const scenario = lesson.scenarios[0]
  await page.goto('/'); await waitForBoard(page)
  await page.getByRole('button', { name: 'Learn', exact: true }).click()
  await page.getByRole('button', { name: new RegExp(`^${lesson.title}.*Not started`) }).click()
  const board = page.getByRole('grid', { name: `${lesson.title} example 1` })
  const relevant = new Set([...scenario.evidence, ...scenario.steps.flatMap(step => [...step.cells, ...step.placements.map(item => item.cell), ...step.eliminations.map(item => item.cell)])])
  const shown = await board.getByRole('gridcell').evaluateAll(cells => cells.map(cell => Array.from(cell.querySelectorAll('.cell-notes span')).map(span => Number(span.textContent)).filter(Boolean)))
  expect(shown).toEqual(scenario.candidates.map((list, cell) => relevant.has(cell) ? list : []))
  expect(await walkthroughPosition(board)).toEqual(await projectedPosition(board, scenario.board.map((value, cell) => ({ value, candidates: scenario.candidates[cell] })), scenario))
  const unannotated = scenario.candidates.findIndex((list, cell) => list.length > 1 && !relevant.has(cell))
  expect(unannotated).toBeGreaterThanOrEqual(0)
  const cell = board.locator(`[data-cell="${unannotated}"]`)
  await cell.click()
  await expect(cell).toHaveAttribute('aria-selected', 'true')
  await expect(cell).toHaveAccessibleName(new RegExp(`candidates ${scenario.candidates[unannotated].join(', ')}$`))
  await expect(cell.locator('.cell-notes')).toHaveCount(0)
})

test('theme and effects preferences work, and restarting is explicitly confirmed', async ({ page }) => {
  await page.goto('/'); await waitForBoard(page)
  await page.getByRole('button', { name: 'Settings',exact:true }).click()
  await page.getByLabel('Theme',{exact:true}).selectOption('dark')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('checkbox', { name: 'Completion effects', exact: true }).uncheck()
  await page.keyboard.press('Escape')
  const board = page.getByRole('grid', { name: 'Daily Sudoku' })
  const selected = board.locator('[tabindex="0"]')
  const index = await selected.getAttribute('data-cell')
  const cell = board.locator(`[data-cell="${index}"]`)
  await cell.click(); await cell.press('7')
  await page.getByRole('button', { name: 'Restart puzzle' }).click()
  await page.getByRole('button', { name: 'Keep playing' }).click()
  await expect(cell).toHaveAccessibleName(/entry 7/)
  await page.getByRole('button', { name: 'Restart puzzle' }).click()
  await page.getByRole('button', { name: 'Clear entries and notes' }).click()
  await expect(cell).toHaveAccessibleName(/empty/)
  await waitForSavedGame(page); await page.reload(); await waitForBoard(page)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('checkbox', { name: 'Completion effects', exact: true })).not.toBeChecked()
})

test('unit rewards do not replay after leaving for lessons', async ({ page }) => {
  const { getDailyPuzzle } = await import('./puzzle-fixture')
  const { createGame, completeUnits } = await import('../src/game')
  const { UNITS } = await import('../src/engine')
  const date = new Date().toISOString().slice(0, 10)
  const puzzle = getDailyPuzzle(date, 'beginner')
  const state = createGame(puzzle)
  const unit = UNITS.slice(0, 9).find(cells => cells.some(cell => !puzzle.givens[cell]))!
  const target = unit.find(cell => !puzzle.givens[cell])!
  unit.forEach(cell => { if (cell !== target) state.values[cell] = puzzle.solution[cell] })
  state.selected = target
  state.rewarded = completeUnits(state.values, puzzle.solution)
  await installGameOnNextLoad(page, state)
  await page.goto('/'); await waitForBoard(page)
  const cell = page.getByRole('grid').locator(`[data-cell="${target}"]`)
  await cell.click(); await cell.press(String(puzzle.solution[target]))
  await expect(page.locator('.reward-layer')).toHaveCount(1)
  await page.getByRole('button', { name: 'Learn', exact: true }).click()
  await page.getByRole('button', { name: 'Daily', exact: true }).click()
  await expect(page.locator('.reward-layer')).toHaveCount(0)
})

test('practice levels, notes, walkthrough reset and unavailable storage stay usable', async ({ page }) => {
  await page.goto('/'); await waitForBoard(page)
  await page.getByRole('button', { name: 'Practice', exact: true }).click(); await waitForBoard(page, /^v3:practice:.*:classic:beginner$/)
  await expect(page.getByRole('grid', { name: 'Practice Sudoku' })).toBeVisible()
  for (const level of ['Intermediate', 'Advanced', 'Expert', 'Beginner']) {
    await page.getByRole('button', { name: level, exact: true }).click(); await waitForBoard(page, new RegExp(`^v3:practice:.*:classic:${level.toLowerCase()}$`))
    await expect(page.getByRole('button', { name: level, exact: true })).toHaveAttribute('aria-pressed', 'true')
  }
  await page.getByRole('grid').getByRole('gridcell',{name:/empty/}).first().click()
  await page.keyboard.press('n');await page.keyboard.press('3')
  await expect(page.getByRole('grid').getByRole('gridcell', { name: /notes/ }).first()).toBeVisible()
  await waitForSavedGame(page)
  await page.getByRole('button', { name: 'Learn', exact: true }).click()
  const lesson = PRACTICAL_LESSONS.find(lesson => lesson.id === 'locked-candidates')!
  const scenario = lesson.scenarios[0]
  expect(scenario.steps.length).toBeGreaterThan(1)
  await page.getByRole('button', { name: new RegExp(`^${lesson.title}.*Not started`) }).click()
  const board = page.getByRole('grid', { name: `${lesson.title} example 1` })
  const before = await walkthroughPosition(board)
  const show = page.getByRole('button', { name: 'Show next step', exact: true })
  await show.click()
  await expect(page.locator('.lesson-step')).toContainText(scenario.steps[0].explanation)
  await expect(show).toBeDisabled()
  expect(await walkthroughPosition(board)).toEqual(before)
  expect(await page.evaluate(() => localStorage.getItem('sudoku-lessons-v1'))).toBeNull()
  await page.getByRole('button', { name: 'Apply step', exact: true }).click()
  expect(await walkthroughPosition(board)).not.toEqual(before)
  await expect(page.locator('.lesson-step')).toHaveCount(0)
  await expect(show).toBeEnabled()
  expect(await page.evaluate(() => localStorage.getItem('sudoku-lessons-v1'))).toBeNull()
  await show.click()
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  expect(await walkthroughPosition(board)).toEqual(before)
  await expect(page.locator('.lesson-step,.walkthrough-result')).toHaveCount(0)
  await expect(show).toBeEnabled()
  expect(await page.evaluate(() => localStorage.getItem('sudoku-lessons-v1'))).toBeNull()
  await page.getByRole('button', { name: /All lessons/ }).click()
  await expect(page.getByRole('button', { name: new RegExp(`^${lesson.title}.*Not started`) })).toBeVisible()
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('blocked', 'SecurityError') } }))
  await page.reload(); await waitForBoard(page)
  await expect(page.getByRole('grid', { name: 'Daily Sudoku' })).toBeVisible()
  await expect(page.getByText('Progress could not be saved in this browser. You can keep playing, but this session may be lost when you leave.')).toBeVisible()
})

for (const width of [320, 390, 1440]) test(`play and lesson views fit ${width}px without page overflow`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  await page.goto('/'); await waitForBoard(page)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Learn', exact: true }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: /^Naked single.*Not started/ }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('each real walkthrough applies every example and persists only completed placements', async ({ page }) => {
  test.setTimeout(180_000)
  expect(PRACTICAL_LESSONS).toHaveLength(8)
  const passed: string[] = []
  await page.goto('/'); await waitForBoard(page); await waitForSavedSession(page)
  await page.getByRole('button', { name: 'Learn', exact: true }).click()
  for (const lesson of PRACTICAL_LESSONS) {
    expect(lesson.scenarios).toHaveLength(lesson.id === 'x-wing' ? 4 : 2)
    await page.getByRole('button', { name: new RegExp(`^${lesson.title}.*Not started`) }).click()
    await expect(page.getByRole('heading', { name: lesson.title, exact: true })).toBeVisible()
    await expect(page.locator('.walkthrough-heading')).toContainText(lesson.rule)
    for (let example = 0; example < lesson.scenarios.length; example++) {
      const scenario = lesson.scenarios[example]
      await page.getByRole('button', { name: `Example ${example + 1}`, exact: true }).click()
      await expect(page.getByRole('button', { name: `Example ${example + 1}`, exact: true })).toHaveAttribute('aria-pressed', 'true')
      const board = page.getByRole('grid', { name: `${lesson.title} example ${example + 1}` })
      const target = board.locator(`[data-cell="${scenario.target}"]`)
      const position = scenario.board.map((value, cell) => ({ value, candidates: [...scenario.candidates[cell]] }))
      expect(await walkthroughPosition(board)).toEqual(await projectedPosition(board, position, scenario))
      await expect(target.locator('.cell-value')).toHaveCount(0)
      for (let index = 0; index < scenario.steps.length; index++) {
        const step = scenario.steps[index]
        const show = page.getByRole('button', { name: 'Show next step', exact: true })
        await expect(page.locator('.lesson-step')).toHaveCount(0)
        await expect(show).toBeEnabled()
        const storedBefore = await page.evaluate(() => localStorage.getItem('sudoku-lessons-v1'))
        await show.click()
        await expect(page.locator('.lesson-step')).toContainText(step.explanation)
        await expect(show).toBeDisabled()
        expect(await walkthroughPosition(board)).toEqual(await projectedPosition(board, position, scenario))
        expect(await page.evaluate(() => localStorage.getItem('sudoku-lessons-v1'))).toBe(storedBefore)
        const placement = step.placements[0]
        const name = placement ? `Place ${placement.digit} at ${coordinate(placement.cell)}` : 'Apply step'
        await page.getByRole('button', { name, exact: true }).click()
        for (const { cell, digit } of step.placements) {
          position[cell] = { value: digit, candidates: [] }
          position.forEach((entry, peer) => {
            const sameUnit = Math.floor(peer / 9) === Math.floor(cell / 9) || peer % 9 === cell % 9 || (Math.floor(peer / 27) === Math.floor(cell / 27) && Math.floor(peer % 9 / 3) === Math.floor(cell % 9 / 3))
            if (sameUnit) entry.candidates = entry.candidates.filter(candidate => candidate !== digit)
          })
        }
        for (const { cell, digit } of step.eliminations) position[cell].candidates = position[cell].candidates.filter(candidate => candidate !== digit)
        expect(await walkthroughPosition(board)).toEqual(await projectedPosition(board, position, scenario))
        await expect(page.locator('.lesson-step')).toHaveCount(0)
        if (index < scenario.steps.length - 1) {
          expect(await page.evaluate(() => localStorage.getItem('sudoku-lessons-v1'))).toBe(storedBefore)
          await expect(show).toBeEnabled()
        }
      }
      passed.push(scenario.id)
      await expect(target).toHaveAccessibleName(new RegExp(`entry ${scenario.digit}(?:, evidence)?$`))
      await expect(target.locator('.cell-value')).toHaveText(String(scenario.digit))
      await expect(page.locator('.walkthrough-result')).toHaveText(`${coordinate(scenario.target)} = ${scenario.digit}`)
      await expect(page.getByRole('button', { name: 'Show next step', exact: true })).toBeDisabled()
      await expect(page.getByRole('button', { name: 'Reset', exact: true })).toBeFocused()
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sudoku-lessons-v1') || '{}'))).toEqual({ version: 1, passed })
      await page.getByRole('button', { name: 'Reset', exact: true }).click()
      expect(await walkthroughPosition(board)).toEqual(await projectedPosition(board, scenario.board.map((value, cell) => ({ value, candidates: scenario.candidates[cell] })), scenario))
      await expect(page.locator('.walkthrough-result')).toHaveCount(0)
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sudoku-lessons-v1') || '{}'))).toEqual({ version: 1, passed })
      await page.getByRole('button', { name: /All lessons/ }).click()
      const status = example < lesson.scenarios.length - 1 ? 'In progress' : 'Completed'
      await expect(page.getByRole('button', { name: new RegExp(`^${lesson.title}.*${status}`) })).toBeVisible()
      await page.reload(); await waitForBoard(page)
      await page.getByRole('button', { name: 'Learn', exact: true }).click()
      await expect(page.getByRole('button', { name: new RegExp(`^${lesson.title}.*${status}`) })).toBeVisible()
      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('sudoku-lessons-v1') || '{}'))
      expect(stored).toEqual({ version: 1, passed })
      if (example < lesson.scenarios.length - 1) await page.getByRole('button', { name: new RegExp(`^${lesson.title}.*In progress`) }).click()
    }
  }
})

test('lesson idle state omits repeated selection instructions',async({page})=>{
  const lesson=PRACTICAL_LESSONS[0],scenario=lesson.scenarios[0]
  await page.goto('/'); await waitForBoard(page)
  await page.getByRole('button',{name:'Learn',exact:true}).click()
  await page.getByRole('button',{name:new RegExp(`^${lesson.title}.*Not started`)}).click()
  for(const text of ['Select a cell to inspect its candidates.','Select a cell for a larger candidate readout.','Select one cell, one number and one action.'])await expect(page.getByText(text,{exact:true})).toHaveCount(0)
  const target=page.getByRole('grid').locator(`[data-cell="${scenario.target}"]`)
  await target.click()
  await expect(target).toHaveAttribute('aria-selected','true')
  await expect(target).toHaveAccessibleName(new RegExp(`candidates ${scenario.candidates[scenario.target].join(', ')}`))
  await expect(page.locator('.lesson-step,.candidate-readout,.proposed-action')).toHaveCount(0)
  await page.getByRole('button',{name:'Show next step',exact:true}).click()
  await expect(page.locator('.lesson-step')).toContainText(scenario.steps[0].explanation)
  await expect(page.getByRole('button',{name:`Place ${scenario.digit} at ${coordinate(scenario.target)}`,exact:true})).toBeVisible()
  await expect(target.locator('.cell-value')).toHaveCount(0)
})

test('applying an intermediate walkthrough step restores keyboard focus to the next action', async ({ page }) => {
  const lesson = PRACTICAL_LESSONS.find(lesson => lesson.id === 'locked-candidates')!
  await page.goto('/'); await waitForBoard(page)
  await page.getByRole('button', { name: 'Learn', exact: true }).click()
  await page.getByRole('button', { name: new RegExp(`^${lesson.title}.*Not started`) }).click()
  const show = page.getByRole('button', { name: 'Show next step', exact: true })
  await show.click()
  await page.getByRole('button', { name: 'Apply step', exact: true }).click()
  await expect(show).toBeEnabled()
  await expect(show).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('.lesson-step')).toContainText(lesson.scenarios[0].steps[1].explanation)
})
