import { expect, test } from '@playwright/test'

import { AgentConnectDriver, readClipboardText } from '#tests/helpers/agent-connect/popover'
import { CanvasHelper } from '#tests/helpers/canvas'

const STATUS_LABELS: Record<string, string> = {
  connected: 'Connected',
  waiting: 'Not connected',
  offline: 'MCP server not running'
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
})

test('Connect AI shows the development setup command and copies it', async ({ page, context }) => {
  // MCP startup can take longer than the default test budget on a cold dev server.
  test.setTimeout(45_000)
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const agent = new AgentConnectDriver(page)
  await expect(agent.trigger).toHaveText('Connect AI')
  await agent.open()
  await expect(agent.popover.getByText('Connect your AI agent', { exact: true })).toBeVisible()

  // The dev server can host local MCP, so the status settles on the server's health
  // rather than the web build's "unavailable" state.
  await expect(agent.trigger).not.toHaveAttribute('data-status', 'starting', { timeout: 20_000 })
  const status = await agent.trigger.getAttribute('data-status')
  expect(status).not.toBe('unavailable')
  await expect(agent.status).toContainText(STATUS_LABELS[status ?? ''] ?? 'unexpected status')

  const step = agent.step('development')
  await expect(step).toContainText('Add it to Claude Code')
  const command = step.locator('code')
  await expect(command).toHaveText(/^claude mcp add --transport http open-pencil http:\/\/\S+$/)
  await agent.copyStep('development')
  await expect(page.getByText('Copied', { exact: true })).toBeVisible()
  expect(await readClipboardText(page)).toBe(await command.textContent())
})

test('Connect AI links to MCP settings', async ({ page }) => {
  const agent = new AgentConnectDriver(page)
  await agent.open()
  await expect(agent.popover.getByRole('link', { name: /Setup guide/ })).toHaveAttribute(
    'href',
    'https://openpencil.dev/programmable/mcp-server'
  )
  await agent.openMCPSettings()
  await expect(agent.popover).toBeHidden()
  await expect(page.getByTestId('settings-mcp-panel')).toBeVisible()
  await expect(page.getByTestId('settings-section-mcp')).toHaveAttribute('aria-selected', 'true')
})
