import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

test('storage settings keep secrets behind the credential manager', async ({ page }) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await page.getByTestId('app-settings-trigger').click()
  await page.getByTestId('settings-section-storage').click()
  const connection = page.getByRole('button', { name: /S3 storage/ })
  await connection.click()
  await page.getByLabel('Endpoint', { exact: true }).fill('https://s3.example.com')
  await page.getByLabel('Bucket', { exact: true }).fill('designs')
  await expect(page.getByRole('button', { name: 'Copy CORS JSON' })).toBeHidden()
  const secret = page.getByLabel('Secret access key', { exact: true })
  await secret.fill('storage-secret')
  const save = page.getByRole('button', { name: 'Save', exact: true })
  await save.click()
  await connection.click()
  await expect(secret).toHaveValue('')
  await expect(secret).toHaveAttribute('placeholder', /Key saved/)
  expect(
    await page.evaluate(() => {
      // oxlint-disable-next-line open-pencil/no-direct-storage-access -- Inspect persisted bytes to detect plaintext credential leaks.
      return Object.values(localStorage).some((value) => value.includes('storage-secret'))
    })
  ).toBe(false)
  await page.getByRole('button', { name: 'Clear', exact: true }).click()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await connection.click()
  await expect(secret).toHaveAttribute('placeholder', /Key saved/)
  await page.getByRole('button', { name: 'Clear', exact: true }).click()
  await save.click()
  await page.getByTestId('app-settings-done').click()
  await page.reload()
  await canvas.waitForInit()
  await page.getByTestId('app-settings-trigger').click()
  await page.getByTestId('settings-section-storage').click()
  await connection.click()
  await expect(page.getByLabel('Endpoint', { exact: true })).toHaveValue('https://s3.example.com')
  await expect(secret).not.toHaveAttribute('placeholder', /Key saved/)
})

test('MCP automation settings filter and persist tool availability', async ({ page }) => {
  await page.route('**/health', (route) =>
    route.fulfill({
      json: {
        status: 'ok',
        tools: [
          {
            name: 'create_shape',
            description: 'Create a shape',
            effect: 'write',
            availability: 'default',
            capabilities: ['document:write'],
            enabled: true
          },
          {
            name: 'get_page_tree',
            description: 'Inspect the page',
            effect: 'read',
            availability: 'default',
            capabilities: ['document:read'],
            enabled: true
          }
        ]
      }
    })
  )
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()

  await page.getByTestId('app-settings-trigger').click()
  await page.getByTestId('settings-section-mcp').click()

  const authentication = page.getByTestId('settings-mcp-authentication')
  await expect(authentication).toHaveAttribute('data-state', 'checked')
  await authentication.click()
  await page.reload()
  await canvas.waitForInit()
  await page.getByTestId('app-settings-trigger').click()
  await page.getByTestId('settings-section-mcp').click()
  await expect(authentication).toHaveAttribute('data-state', 'unchecked')
  await authentication.click()

  await page.getByRole('button', { name: 'Tool access', exact: true }).click()
  const search = page.getByRole('searchbox', { name: 'Search tools' })
  await search.fill('create_shape')
  await expect(search).toHaveValue('create_shape')
  const createShape = page.getByRole('switch', { name: 'create_shape', exact: true })
  await expect(createShape).toBeVisible()
  await expect(page.getByRole('switch', { name: 'get_page_tree', exact: true })).toBeHidden()

  await createShape.click()
  await page.reload()
  await canvas.waitForInit()
  await page.getByTestId('app-settings-trigger').click()
  await page.getByTestId('settings-section-mcp').click()
  await page.getByRole('button', { name: 'Tool access', exact: true }).click()
  await expect(createShape).toHaveAttribute('data-state', 'unchecked')

  await page.getByRole('button', { name: 'Restore defaults' }).click()
  await expect(createShape).toHaveAttribute('data-state', 'checked')
})

test('browser credential preferences live in General, not the footer', async ({ page }) => {
  await page.goto('/')
  await new CanvasHelper(page).waitForInit()
  await page.keyboard.press('ControlOrMeta+,')
  const panel = page.getByTestId('settings-general-panel')
  const remember = panel.getByRole('switch', { name: 'Remember API keys on this device' })
  await expect(remember).toBeVisible()
  if ((await remember.getAttribute('aria-checked')) === 'true') await remember.click()
  await expect(remember).toHaveAttribute('aria-checked', 'false')
  await expect(panel.getByText('Keys are kept only until you close this session.')).toBeVisible()
  await remember.click()
  await expect(remember).toHaveAttribute('aria-checked', 'true')
  await expect(panel.getByText('Keys are kept only until you close this session.')).toBeHidden()
  await expect(page.getByText('system credential store', { exact: false })).toHaveCount(0)
  await page.getByTestId('app-settings-done').click()
})
