import { expect, test, type Locator, type Page } from '@playwright/test'
import { waitForBoard } from './puzzle-fixture'

async function hold(page: Page, button: Locator, target: Locator, expected: RegExp) {
  await button.hover(); await page.mouse.down()
  try {
    await expect(target).toHaveAccessibleName(expected)
  } finally {
    await page.mouse.up()
  }
  await expect(target).toHaveAccessibleName(expected)
}

test('holding a number adds one note without changing the active mode', async ({ page }) => {
  await page.goto('/'); await waitForBoard(page)
  const cell = page.getByRole('gridcell', { name: /empty/ }).first()
  const index = await cell.getAttribute('data-cell')
  const target = page.locator(`[data-cell="${index}"]`)
  await target.click()
  const number = page.getByRole('button', { name: 'Enter 1', exact: true })
  await number.hover(); await page.mouse.down()
  try {
    await expect(target).toHaveAccessibleName(/notes 1/)
  } finally {
    await page.mouse.up()
  }
  await expect(target).toHaveAccessibleName(/notes 1/)
  await expect(page.getByRole('button', { name: 'Notes', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.game-status')).toHaveText('Notes updated.')
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(target).toHaveAccessibleName(/empty/)
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
})

for (const mode of ['daily', 'practice'] as const) for (const variant of ['classic', 'x', 'killer'] as const) {
  test(`${mode} ${variant}: every digit supports tap and inverted hold in both note modes`, async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/'); await waitForBoard(page)
    if (mode === 'practice') await page.getByRole('button', { name: 'Practice', exact: true }).click()
    await page.getByLabel('Game mode', { exact: true }).selectOption(variant)
    await waitForBoard(page, new RegExp(`^v3:${mode}:.*:${variant}:beginner$`))
    const empty = page.getByRole('gridcell', { name: /empty/ }).first()
    const index = await empty.getAttribute('data-cell')
    const target = page.locator(`[data-cell="${index}"]`)
    const notes = page.getByRole('button', { name: 'Notes', exact: true })
    const undo = page.getByRole('button', { name: 'Undo', exact: true })
    await target.click()
    for (let digit = 1; digit <= 9; digit++) {
      const number = page.locator('.number-pad button').nth(digit - 1)
      await expect(number).toBeEnabled()
      await hold(page, number, target, new RegExp(`notes ${digit}(?:,|$)`))
      await expect(notes).toHaveAttribute('aria-pressed', 'false')
      await number.click()
      await expect(target).toHaveAccessibleName(new RegExp(`entry ${digit}(?:,|$)`))
      await undo.click()
      await expect(target).toHaveAccessibleName(new RegExp(`notes ${digit}(?:,|$)`))
      await notes.click()
      await hold(page, number, target, new RegExp(`entry ${digit}(?:,|$)`))
      await expect(notes).toHaveAttribute('aria-pressed', 'true')
      await expect(page.locator('.game-status')).toHaveText('Entry updated.')
      await undo.click()
      await expect(target).toHaveAccessibleName(new RegExp(`notes ${digit}(?:,|$)`))
      await number.click()
      await expect(target).toHaveAccessibleName(/empty/)
      await notes.click()
    }
  })
}

test('a short pointer press and keyboard activation keep the normal mode', async ({ page }) => {
  await page.goto('/'); await waitForBoard(page)
  const index = await page.getByRole('gridcell', { name: /empty/ }).first().getAttribute('data-cell')
  const target = page.locator(`[data-cell="${index}"]`)
  await target.click()
  const number = page.locator('.number-pad button').first()
  await number.hover(); await page.mouse.down()
  await expect(target).toHaveAccessibleName(/empty/)
  await page.mouse.up()
  await expect(target).toHaveAccessibleName(/entry 1/)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await number.focus(); await page.keyboard.press('Enter')
  await expect(target).toHaveAccessibleName(/entry 1/)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await page.getByRole('button', { name: 'Notes', exact: true }).click()
  await number.focus(); await page.keyboard.press('Space')
  await expect(target).toHaveAccessibleName(/notes 1/)
})

test('holding past recognition never repeats and the following tap still works', async ({ page }) => {
  await page.goto('/'); await waitForBoard(page)
  await page.clock.install()
  const index = await page.getByRole('gridcell', { name: /empty/ }).first().getAttribute('data-cell')
  const target = page.locator(`[data-cell="${index}"]`)
  await target.click()
  const number = page.getByRole('button', { name: 'Enter 1', exact: true })
  await number.hover(); await page.mouse.down()
  await page.clock.runFor(499)
  await expect(target).toHaveAccessibleName(/empty/)
  await page.clock.runFor(1)
  await expect(target).toHaveAccessibleName(/notes 1/)
  await page.clock.runFor(2000)
  await page.mouse.up()
  await expect(target).toHaveAccessibleName(/notes 1/)
  await number.click()
  await expect(target).toHaveAccessibleName(/entry 1/)
})

for (const cancellation of ['movement', 'leave', 'pointercancel', 'blur', 'focus', 'selection', 'mode', 'navigation', 'settings'] as const) {
  test(`an interrupted hold is discarded on ${cancellation}`, async ({ page }) => {
    await page.goto('/'); await waitForBoard(page)
    await page.clock.install()
    const empties = page.getByRole('gridcell', { name: /empty/ })
    const index = await empties.first().getAttribute('data-cell')
    const target = page.locator(`[data-cell="${index}"]`)
    await target.click()
    const number = page.getByRole('button', { name: 'Enter 1', exact: true })
    await number.hover(); await page.mouse.down()
    await page.clock.runFor(250)
    if (cancellation === 'movement') {
      const box = (await number.boundingBox())!
      await page.mouse.move(box.x + box.width / 2 + 11, box.y + box.height / 2)
    } else if (cancellation === 'leave') await page.mouse.move(0, 0)
    else if (cancellation === 'pointercancel') await number.dispatchEvent('pointercancel', { pointerId: 1 })
    else if (cancellation === 'blur') await page.evaluate(() => window.dispatchEvent(new Event('blur')))
    else if (cancellation === 'focus') await page.getByRole('button', { name: 'Notes', exact: true }).focus()
    else if (cancellation === 'selection') await empties.nth(1).evaluate(element => (element as HTMLElement).click())
    else if (cancellation === 'mode') await page.getByRole('button', { name: 'Notes', exact: true }).evaluate(element => (element as HTMLElement).click())
    else if (cancellation === 'settings') await page.getByRole('button', { name: 'Settings', exact: true }).evaluate(element => (element as HTMLElement).click())
    else await page.getByRole('button', { name: 'Learn', exact: true }).evaluate(element => (element as HTMLElement).click())
    await page.clock.runFor(1000)
    await page.mouse.up()
    if (cancellation === 'navigation') await page.getByRole('button', { name: 'Daily', exact: true }).click()
    if (cancellation === 'settings') await page.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(target).toHaveAccessibleName(/empty/)
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
    const current = page.locator('.number-pad button').first()
    await current.click()
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled()
  })
}

test.describe('touch keypad', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } })

  test('native touch hold inverts both modes and sliding cancels a pending hold', async ({ page }) => {
    await page.goto('/'); await waitForBoard(page)
    const index = await page.getByRole('gridcell', { name: /empty/ }).first().getAttribute('data-cell')
    const target = page.locator(`[data-cell="${index}"]`)
    await target.tap()
    const number = page.locator('.number-pad button').first()
    const box = (await number.boundingBox())!
    const touch = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    const cdp = await page.context().newCDPSession(page)
    for (const expected of [/notes 1/, /entry 1/]) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] })
      try {
        await expect(target).toHaveAccessibleName(expected)
      } finally {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      }
      await expect(target).toHaveAccessibleName(expected)
      if (expected.source === 'notes 1') await page.getByRole('button', { name: 'Notes', exact: true }).tap()
    }
    await page.getByRole('button', { name: 'Undo', exact: true }).tap()
    await expect(target).toHaveAccessibleName(/notes 1/)
    await page.clock.install()
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touch.x + 15, y: touch.y }] })
    await page.clock.runFor(1000)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect(target).toHaveAccessibleName(/notes 1/)
    await cdp.detach()
  })
})
