import { GITHUB_OAUTH_MESSAGE_TYPE, GITHUB_OAUTH_START_PATH } from './provider'

/**
 * Browser half of the GitHub OAuth web flow. The Pages Function exchanges the code with
 * the client secret and hands the token back to this window only: the message must come
 * from this origin, from the popup this window opened, and carry this attempt's state.
 */

const STATE_BYTES = 32
const OAUTH_TIMEOUT_MS = 5 * 60_000

export type GitHubOAuthMessage = {
  type: typeof GITHUB_OAUTH_MESSAGE_TYPE
  state: string
  token?: string
  error?: string
}

export class GitHubOAuthError extends Error {
  constructor(
    readonly reason: 'cancelled' | 'timeout' | 'denied' | 'popup-blocked',
    message: string
  ) {
    super(message)
    this.name = 'GitHubOAuthError'
  }
}

export function createOAuthState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(STATE_BYTES))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** The hosted start endpoint, resolved against the app's deployment base path. */
export function githubOAuthStartURL(state: string, base: string, origin: string): string {
  const url = new URL(GITHUB_OAUTH_START_PATH, new URL(base, origin))
  url.searchParams.set('state', state)
  return url.toString()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isGitHubOAuthMessage(data: unknown, state: string): data is GitHubOAuthMessage {
  if (!isRecord(data)) return false
  return (
    data.type === GITHUB_OAUTH_MESSAGE_TYPE &&
    data.state === state &&
    (typeof data.token === 'string' || typeof data.error === 'string')
  )
}

type MessageTarget = Pick<Window, 'addEventListener' | 'removeEventListener'>

export interface WaitForOAuthOptions {
  state: string
  /** The popup this window opened; window messages from any other source are ignored. */
  popup: MessageEventSource | null
  origin: string
  target: MessageTarget
  signal?: AbortSignal
  timeoutMs?: number
}

/** Resolve with the token from the matching callback message. */
export function waitForGitHubOAuthToken(options: WaitForOAuthOptions): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      finish(new GitHubOAuthError('timeout', 'GitHub sign-in timed out.'))
    }, options.timeoutMs ?? OAUTH_TIMEOUT_MS)
    function finish(result: string | Error) {
      clearTimeout(timer)
      options.target.removeEventListener('message', onWindowMessage)
      options.signal?.removeEventListener('abort', onAbort)
      if (typeof result === 'string') resolve(result)
      else reject(result)
    }
    function accept(data: unknown) {
      if (!isGitHubOAuthMessage(data, options.state)) return
      if (data.token) finish(data.token)
      else finish(new GitHubOAuthError('denied', data.error ?? 'GitHub sign-in failed.'))
    }
    function onWindowMessage(event: MessageEvent) {
      if (event.origin !== options.origin) return
      if (!options.popup || event.source !== options.popup) return
      accept(event.data)
    }
    function onAbort() {
      finish(new GitHubOAuthError('cancelled', 'GitHub sign-in was cancelled.'))
    }
    if (options.signal?.aborted) {
      onAbort()
      return
    }
    options.target.addEventListener('message', onWindowMessage)
    options.signal?.addEventListener('abort', onAbort)
  })
}
