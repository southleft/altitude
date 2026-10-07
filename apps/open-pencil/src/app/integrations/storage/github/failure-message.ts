import type { GitHubErrorKind } from './client'

interface GitHubMessages {
  githubErrorUnauthorized: string
  githubErrorForbidden: string
  githubErrorNotFound: string
  githubErrorRateLimited: string
  githubErrorRateLimitedUntil: (params: { time: string }) => string
  githubErrorTooLarge: string
  githubErrorNetwork: string
  githubErrorFailed: string
}

/** Translated text for a GitHub failure; never the raw response body. */
export function githubFailureMessage(
  kind: GitHubErrorKind | 'unknown',
  resetAt: Date | null,
  messages: GitHubMessages,
  locale: string
): string {
  switch (kind) {
    case 'unauthorized':
      return messages.githubErrorUnauthorized
    case 'forbidden':
      return messages.githubErrorForbidden
    case 'not-found':
      return messages.githubErrorNotFound
    case 'rate-limited':
      return resetAt
        ? messages.githubErrorRateLimitedUntil({
            time: resetAt.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
          })
        : messages.githubErrorRateLimited
    case 'too-large':
      return messages.githubErrorTooLarge
    case 'network':
      return messages.githubErrorNetwork
    default:
      return messages.githubErrorFailed
  }
}

/** "3 minutes ago" in the UI locale. */
export function relativeTime(date: Date, locale: string, now = Date.now()): string {
  const seconds = Math.round((date.getTime() - now) / 1000)
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60]
  ]
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit)
  }
  return format.format(seconds, 'second')
}
