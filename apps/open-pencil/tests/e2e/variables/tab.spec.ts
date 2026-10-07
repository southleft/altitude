import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import {
  activeModeName,
  seedModeCollection,
  VariablesTabDriver
} from '#tests/helpers/variables/panel'

test.beforeEach(async ({ page }) => {
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
})

test('Variables tab replaces the Design tab content and survives switching back', async ({
  page
}) => {
  const variables = new VariablesTabDriver(page)
  await expect(variables.section).toBeHidden()
  await variables.open()
  await expect(variables.tab).toHaveAttribute('data-state', 'active')
  await expect(variables.section.getByText('No local variables')).toBeVisible()
  await expect(variables.section.getByRole('button', { name: 'Import tokens…' })).toBeVisible()

  await page.getByTestId('properties-tab-design').click()
  await expect(variables.section).toBeHidden()
  await variables.open()
  await expect(variables.tab).toHaveAttribute('data-state', 'active')
})

test('Variables tab switches the active mode of a multi-mode collection', async ({ page }) => {
  const seed = await seedModeCollection(page, 'Theme')
  const variables = new VariablesTabDriver(page)
  await variables.open()
  await expect(variables.section.getByText('1 / 1')).toBeVisible()
  const select = variables.modeSelect(seed.name)
  await expect(select).toHaveText('Light')
  await variables.selectMode(seed.name, 'Dark')
  await expect(select).toHaveText('Dark')
  expect(await activeModeName(page, seed.collectionId)).toBe('Dark')
})

test('Variables tab opens the variables dialog', async ({ page }) => {
  await seedModeCollection(page, 'Theme')
  const variables = new VariablesTabDriver(page)
  await variables.openDialog()
  await expect(variables.dialog.getByTestId('variable-row')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(variables.dialog).toBeHidden()
})
