import {expect,test} from '@playwright/test'
import { waitForBoard } from './puzzle-fixture'

test('naked triple teaches an actual placement in a real puzzle without exercise baggage',async({page})=>{
 await page.goto('/'); await waitForBoard(page);await page.getByRole('button',{name:'Learn',exact:true}).click()
 await page.getByRole('button',{name:/^Naked triple/}).click()
 await expect(page.getByRole('grid')).toBeVisible()
 expect(await page.locator('.cell.given .cell-value').count()).toBeGreaterThan(15)
 await expect(page.getByRole('radio',{name:'Eliminate a candidate',exact:true})).toHaveCount(0)
 for(const text of ['Before you begin','Your deduction','Check reasoning','Candidate study.','Select one cell, one number and one action.'])await expect(page.getByText(text,{exact:false})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Show next step',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Show next step',exact:true}).click()
 await expect(page.locator('.lesson-step')).toContainText(/triple|three/i)
 await expect(page.getByRole('button',{name:'Apply step',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Apply step',exact:true}).click()
 await page.getByRole('button',{name:'Show next step',exact:true}).click()
 await expect(page.locator('.lesson-step')).toContainText(/Only [1-9] remains|only.*can contain/i)
 await page.getByRole('button',{name:/^Place [1-9] at r[1-9]c[1-9]$/}).click()
 await expect(page.locator('.walkthrough-result')).toHaveText(/^r[1-9]c[1-9] = [1-9]$/)
 await expect(page.locator('.cell:not(.given) .cell-value')).toHaveCount(1)
 await expect(page.locator('[data-cell="66"]')).not.toHaveAccessibleName(/candidates.*8/)
 const notes=await page.locator('.cell-notes span').allTextContents()
 expect(notes.filter(text=>text.trim()).length).toBeLessThan(120)
})
