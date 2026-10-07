import { expect, type Page } from '@playwright/test'

/** UI driver for the right panel's Connect AI popover. */
export class AgentConnectDriver {
  constructor(private readonly page: Page) {}

  get trigger() {
    return this.page.getByTestId('agent-connect-button')
  }

  get popover() {
    return this.page.getByTestId('agent-connect-popover')
  }

  get status() {
    return this.popover.getByRole('status')
  }

  step(id: string) {
    return this.popover.locator(`[data-step="${id}"]`)
  }

  async open(): Promise<void> {
    await this.trigger.click()
    await expect(this.popover).toBeVisible()
  }

  async copyStep(id: string): Promise<void> {
    await this.step(id).getByRole('button', { name: 'Copy', exact: true }).click()
  }

  async openMCPSettings(): Promise<void> {
    await this.popover.getByRole('button', { name: 'MCP settings', exact: true }).click()
  }
}

/** Probe: the clipboard text. Requires clipboard permissions on the browser context. */
export function readClipboardText(page: Page): Promise<string> {
  return page.evaluate(() => navigator.clipboard.readText())
}
