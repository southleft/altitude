import { describe, expect, test } from 'bun:test'

import {
  githubOAuthStartURL,
  GitHubOAuthError,
  isGitHubOAuthMessage,
  waitForGitHubOAuthToken
} from '@/app/integrations/storage/github/oauth'
import { GITHUB_OAUTH_MESSAGE_TYPE } from '@/app/integrations/storage/github/provider'

const ORIGIN = 'https://altitude.pages.dev'
const STATE = 'f'.repeat(64)

function harness() {
  const target = new EventTarget()
  // Real windows are unavailable here; MessagePorts stand in as distinct event sources.
  const popup: MessageEventSource = new MessageChannel().port1
  const send = (
    data: unknown,
    init: { origin?: string; source?: MessageEventSource | null } = {}
  ) =>
    target.dispatchEvent(
      new MessageEvent('message', {
        data,
        origin: init.origin ?? ORIGIN,
        source: init.source === undefined ? popup : init.source
      })
    )
  return { target, popup, send }
}

describe('GitHub OAuth message handling', () => {
  test('the start URL resolves against the deployment base path', () => {
    expect(githubOAuthStartURL(STATE, '/open-pencil/', ORIGIN)).toBe(
      `${ORIGIN}/open-pencil/auth/github/start?state=${STATE}`
    )
  })

  test('accepts only this origin, this popup, and this state', async () => {
    const { target, popup, send } = harness()
    const token = waitForGitHubOAuthToken({ state: STATE, popup, origin: ORIGIN, target })
    const message = { type: GITHUB_OAUTH_MESSAGE_TYPE, state: STATE, token: 'gho_right' }
    send({ ...message, token: 'gho_other_origin' }, { origin: 'https://evil.example' })
    send({ ...message, token: 'gho_other_window' }, { source: new MessageChannel().port1 })
    send({ ...message, token: 'gho_no_source' }, { source: null })
    send({ ...message, state: 'e'.repeat(64), token: 'gho_other_state' })
    send({ type: 'something-else', state: STATE, token: 'gho_other_type' })
    send(message)
    expect(await token).toBe('gho_right')
  })

  test('an error message from the callback rejects as denied', async () => {
    const { target, popup, send } = harness()
    const token = waitForGitHubOAuthToken({ state: STATE, popup, origin: ORIGIN, target })
    send({ type: GITHUB_OAUTH_MESSAGE_TYPE, state: STATE, error: 'access_denied' })
    const error = (await token.catch((e) => e)) as GitHubOAuthError
    expect(error).toBeInstanceOf(GitHubOAuthError)
    expect(error.reason).toBe('denied')
  })

  test('cancelling and timing out stop listening', async () => {
    const { target, popup, send } = harness()
    const controller = new AbortController()
    const cancelled = waitForGitHubOAuthToken({
      state: STATE,
      popup,
      origin: ORIGIN,
      target,
      signal: controller.signal
    })
    controller.abort()
    expect(((await cancelled.catch((e) => e)) as GitHubOAuthError).reason).toBe('cancelled')
    const timedOut = waitForGitHubOAuthToken({
      state: STATE,
      popup,
      origin: ORIGIN,
      target,
      timeoutMs: 5
    })
    expect(((await timedOut.catch((e) => e)) as GitHubOAuthError).reason).toBe('timeout')
    send({ type: GITHUB_OAUTH_MESSAGE_TYPE, state: STATE, token: 'late' })
  })

  test('message shape guard', () => {
    expect(isGitHubOAuthMessage(null, STATE)).toBe(false)
    expect(isGitHubOAuthMessage({ type: GITHUB_OAUTH_MESSAGE_TYPE, state: STATE }, STATE)).toBe(
      false
    )
    expect(
      isGitHubOAuthMessage({ type: GITHUB_OAUTH_MESSAGE_TYPE, state: STATE, token: 't' }, STATE)
    ).toBe(true)
  })
})
