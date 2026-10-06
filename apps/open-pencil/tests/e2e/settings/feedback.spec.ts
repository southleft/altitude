import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

async function openSettings(page: Page) {
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+,' : 'Control+,')
}

test('storage validates preferences and test credentials without saving', async ({ page }) => {
  await openSettings(page)
  await page.getByTestId('settings-section-storage').click()
  await expect(
    page.getByText('Configure the connection before opening the workspace.')
  ).toBeVisible()
  await page.getByRole('button', { name: /S3 storage/ }).click()
  const endpoint = page.getByRole('textbox', { name: 'Endpoint', exact: true })
  const bucket = page.getByRole('textbox', { name: 'Bucket', exact: true })
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(endpoint).toBeFocused()
  await expect(endpoint).toHaveAttribute('aria-invalid', 'true')
  await endpoint.fill('https://example.com')
  await bucket.fill('designs')
  await expect(endpoint).toHaveAttribute('aria-invalid', 'false')
  await page.getByTestId('settings-storage-test').click()
  const key = page.getByRole('textbox', { name: 'Access key ID', exact: true })
  await expect(key).toBeFocused()
  await expect(key).toHaveAttribute('aria-invalid', 'true')
  await expect(key).toHaveAccessibleDescription('This field is required.')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(
    page.getByText('Configure the connection before opening the workspace.')
  ).toBeVisible()
})

async function failCredentialWrites(page: Page) {
  return page.evaluateHandle(async () => {
    const path = '/src/app/settings/credentials/app.ts'
    const { appCredentialServices } = await import(path)
    const original = appCredentialServices.manager.set
    appCredentialServices.manager.set = async () => {
      throw new Error('Test credential write failure')
    }
    return {
      restore() {
        appCredentialServices.manager.set = original
      }
    }
  })
}

test('media explains optional keys and preserves input after a failed save', async ({ page }) => {
  await openSettings(page)
  await page.getByTestId('settings-section-media').click()
  await page.getByRole('button', { name: /Pexels/ }).click()
  const key = page.getByRole('textbox', { name: 'API key', exact: true })
  await expect(page.getByRole('link', { name: 'Get API key' })).toHaveAttribute(
    'href',
    'https://www.pexels.com/api/'
  )
  await expect(key).toHaveAccessibleDescription('Optional. Add a key to enable this service.')
  await key.fill('test-only-replacement')
  const failure = await failCredentialWrites(page)
  try {
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(key).toHaveValue('test-only-replacement')
    await expect(key).not.toHaveAttribute('aria-invalid', 'true')
    await expect(
      page.getByRole('alert', {
        name: 'Could not save these changes. Check the settings and try again.',
        exact: true
      })
    ).toBeVisible()
    await expect(key).toHaveAccessibleDescription('Optional. Add a key to enable this service.')
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled()
  } finally {
    await failure.evaluate((handle) => handle.restore())
    await failure.dispose()
  }
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('button', { name: /Pexels/ })).toBeVisible()
})
