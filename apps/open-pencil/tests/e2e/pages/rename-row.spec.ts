import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

test('page rows keep the same compact height while renaming', async ({ page }) => {
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  const row = page.getByTestId('pages-row').first()
  await expect(row).toHaveCSS('height', '24px')
  await row.getByRole('button').dblclick()
  await expect(page.getByTestId('pages-item-input')).toBeVisible()
  await expect(row).toHaveCSS('height', '24px')
  await page.getByTestId('pages-item-input').press('Escape')
  await expect(row).toHaveCSS('height', '24px')
})
