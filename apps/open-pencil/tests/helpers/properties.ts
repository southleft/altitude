import type { Locator, Page } from '@playwright/test'

export function propertySection(page: Page, name: string): Locator {
  return page.getByRole('region', { name, exact: true })
}

export function propertyField(page: Page, property: string): Locator {
  return page.locator(`[data-property=${JSON.stringify(property)}]`)
}

export function propertyItems(page: Page, property: string): Locator {
  return page.locator(`[data-property=${JSON.stringify(property)}][data-index]`)
}

export function propertyItem(page: Page, property: string, index = 0): Locator {
  return page.locator(
    `[data-property=${JSON.stringify(property)}][data-index=${JSON.stringify(String(index))}]`
  )
}
