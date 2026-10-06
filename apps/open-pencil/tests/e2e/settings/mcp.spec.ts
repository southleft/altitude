import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

async function selectMCPSection(page: Page, mobile: boolean) {
  if (mobile) {
    await page.getByRole('combobox', { name: 'Settings', exact: true }).click()
    await page.getByRole('option', { name: 'MCP', exact: true }).click()
  } else {
    await page.getByTestId('settings-section-mcp').click()
  }
}

for (const viewport of [
  { width: 1280, height: 900 },
  { width: 390, height: 844 }
]) {
  test(`MCP settings separate access controls and persist browser access at ${viewport.width}px`, async ({
    page
  }) => {
    await page.setViewportSize(viewport)
    await page.goto('/?test')
    const canvas = new CanvasHelper(page)
    await canvas.waitForInit()
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+,' : 'Control+,')
    await selectMCPSection(page, viewport.width < 640)
    await expect(page.getByRole('heading', { name: 'Local server', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Tool access', exact: true }).click()
    const search = page.getByRole('searchbox', { name: 'Search tools' })
    await search.fill('no-such-mcp-tool')
    await expect(page.getByText('No tools match your search.', { exact: true })).toBeVisible()
    await selectMCPSection(page, viewport.width < 640)
    const access = page.getByRole('combobox', { name: 'Browser agent access' })
    await expect(access).toHaveText('Off')
    await access.click()
    await page.getByRole('option', { name: 'Inspect', exact: true }).click()
    await expect(
      page.getByText('Agents can inspect the document but cannot change it.', { exact: true })
    ).toBeVisible()
    // Outbound MCP connections serve only the dormant built-in AI agents, so they stay hidden.
    await expect(page.getByRole('button', { name: 'Add connection', exact: true })).toHaveCount(0)
    await page.getByTestId('app-settings-done').click()
    await page.reload()
    await canvas.waitForInit()
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+,' : 'Control+,')
    await selectMCPSection(page, viewport.width < 640)
    await expect(access).toHaveText('Inspect')
  })
}
