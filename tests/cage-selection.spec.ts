import { expect, test } from '@playwright/test'
import { getDailyPuzzle, waitForBoard } from './puzzle-fixture'

for (const theme of ['light', 'dark'] as const) {
  test(`the selected Killer cage has a brighter hairline outline in ${theme}`, async ({ page }) => {
    await page.addInitScript(theme => localStorage.setItem('sudoku-theme', theme), theme)
    await page.goto('/'); await waitForBoard(page)
    await page.getByLabel('Game mode', { exact: true }).selectOption('killer')
    await waitForBoard(page, /:killer:beginner$/)
    const date = (await page.locator('time').getAttribute('datetime'))!
    const puzzle = getDailyPuzzle(date, 'beginner', 'killer')
    const cageIndex = puzzle.cages!.findIndex(cage => cage.cells.length > 1)
    expect(cageIndex).toBeGreaterThanOrEqual(0)
    const cage = puzzle.cages![cageIndex]
    // Select a non-sum cell: the whole cage, not just the label cell, owns emphasis.
    const selected = cage.cells.find(cell => cell !== Math.min(...cage.cells))!
    const target = page.locator(`[data-cell="${selected}"]`)
    await target.click()
    const active = page.locator(`.cage-outlines path[data-cage="${cageIndex}"]`)
    const fullInk = theme === 'dark' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)'
    await expect(active).toHaveCSS('stroke', fullInk)
    const paints = await page.locator('.cage-outlines path').evaluateAll(paths => paths.map(path => ({
      cage: Number(path.getAttribute('data-cage')),
      stroke: getComputedStyle(path).stroke,
      width: getComputedStyle(path).strokeWidth,
      path: path.getAttribute('d'),
      pattern: path.getAttribute('stroke-dasharray'),
    })))
    expect(paints.filter(paint => paint.stroke === fullInk).map(paint => paint.cage)).toEqual([cageIndex])
    expect(paints.every(paint => paint.width === '1px')).toBe(true)
    await expect(target).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('gridcell')).toHaveCount(81)
    await expect(page.locator('[role="gridcell"][tabindex="0"]')).toHaveCount(1)
    await expect(page.locator('.cage-outlines')).toHaveCSS('pointer-events', 'none')
    await page.setViewportSize({ width: 390, height: 1000 })
    await page.screenshot({ path: test.info().outputPath(`selected-cage-${theme}.png`), fullPage: true })
    await page.locator(`[data-cell="${Math.min(...cage.cells)}"]`).click()
    await expect(active).toHaveCSS('stroke', fullInk)
    await target.click()
    // Move via the real board keyboard handler into a different cage.
    const other = puzzle.cages!.find(cage => !cage.cells.includes(selected))!.cells[0]
    await target.press('Control+Home')
    const row = Math.floor(other / 9), column = other % 9
    for (let step = 0; step < row; step++) await page.keyboard.press('ArrowDown')
    for (let step = 0; step < column; step++) await page.keyboard.press('ArrowRight')
    await expect(page.locator(`[data-cell="${other}"]`)).toBeFocused()
    const otherIndex = puzzle.cages!.findIndex(cage => cage.cells.includes(other))
    await expect(page.locator(`.cage-outlines path[data-cage="${otherIndex}"]`)).toHaveCSS('stroke', fullInk)
    await expect(active).not.toHaveCSS('stroke', fullInk)
    const after = await page.locator('.cage-outlines path').evaluateAll(paths => paths.map(path => ({
      path: path.getAttribute('d'), pattern: path.getAttribute('stroke-dasharray'),
    })))
    expect(after).toEqual(paints.map(({ path, pattern }) => ({ path, pattern })))
    await page.getByRole('button', { name: 'Practice', exact: true }).click()
    await waitForBoard(page, /^v3:practice:.*:killer:beginner$/)
    const practiceCell = page.getByRole('gridcell').nth(40)
    await practiceCell.click()
    const practiceCage = await practiceCell.getAttribute('data-cage')
    await expect(page.locator(`.cage-outlines path[data-cage="${practiceCage}"]`)).toHaveCSS('stroke', fullInk)
    await page.getByLabel('Game mode', { exact: true }).selectOption('classic')
    await waitForBoard(page, /:classic:beginner$/)
    await expect(page.locator('.cage-outlines')).toHaveCount(0)
  })
}
