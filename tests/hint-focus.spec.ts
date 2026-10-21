import { expect, test, type Page } from '@playwright/test'

async function openHintWithKeyboard(page: Page) {
  const hint = page.getByRole('button', { name: 'Hint', exact: true })
  for (let tabs = 0; tabs < 50; tabs++) {
    if (await hint.evaluate(element => element === document.activeElement)) break
    await page.keyboard.press('Tab')
  }
  await expect(hint).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(hint).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('region', { name: 'Hint details' })).toBeVisible()
  return hint
}

test('closing a hint with the keyboard returns focus without changing the board', async ({ page }) => {
  await page.goto('/')
  const board = page.getByRole('grid', { name: 'Daily Sudoku' })
  const before = await board.getByRole('gridcell').allTextContents()
  const hint = await openHintWithKeyboard(page)

  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Close hint', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')

  await expect(page.getByRole('region', { name: 'Hint details' })).toHaveCount(0)
  await expect(hint).toHaveAttribute('aria-expanded', 'false')
  expect(await board.getByRole('gridcell').allTextContents()).toEqual(before)
  await expect(hint).toBeFocused()
})

test('applying a placement with the keyboard returns focus to Hint', async ({ page }) => {
  await page.goto('/')
  const board = page.getByRole('grid', { name: 'Daily Sudoku' })
  const before = await board.getByRole('gridcell').allTextContents()
  const hint = await openHintWithKeyboard(page)

  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Close hint', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Apply this step', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')

  await expect(page.getByRole('region', { name: 'Hint details' })).toHaveCount(0)
  await expect(hint).toHaveAttribute('aria-expanded', 'false')
  const after = await board.getByRole('gridcell').allTextContents()
  const changed = after.flatMap((value, cell) => value === before[cell] ? [] : [cell])
  expect(changed).toHaveLength(1)
  expect(before[changed[0]]).toBe('')
  expect(after[changed[0]]).toMatch(/^[1-9]$/)
  await expect(hint).toBeFocused()
})
