import * as v from 'valibot'

import type { Color } from '@open-pencil/scene-graph/primitives'

import type { GitHubIdentity } from '@/app/integrations/storage/github/identity'

/**
 * GitHub identity in collaboration presence. Display-only: rooms stay protected by their
 * link secret, and any peer can claim any name or avatar until rooms are relay-gated.
 */
export const GITHUB_AVATAR_ORIGIN = 'https://avatars.githubusercontent.com'
/** Avatar edge requested from GitHub, in pixels; cursors draw it at 16 CSS pixels. */
const AVATAR_SIZE = 64
const MAX_NAME_LENGTH = 64
const LOGIN_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/

/** The `user` field each peer broadcasts through awareness. */
export type CollabUser = {
  name: string
  color: Color
  login?: string
  avatar?: string
}

/**
 * A GitHub avatar URL normalized to a fixed size, or null for anything not served by
 * avatars.githubusercontent.com over HTTPS. Peers' avatars come from untrusted awareness.
 */
export function safeAvatarURL(value: unknown, size = AVATAR_SIZE): string | null {
  if (typeof value !== 'string' || value.length > 512) return null
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.origin !== GITHUB_AVATAR_ORIGIN || url.username || url.password) return null
  url.hash = ''
  url.searchParams.set('s', String(size))
  return url.href
}

export function safeLogin(value: unknown): string | undefined {
  return typeof value === 'string' && LOGIN_PATTERN.test(value) ? value : undefined
}

function displayName(value: string): string {
  return value.trim().slice(0, MAX_NAME_LENGTH)
}

/**
 * This tab's presence: the GitHub display name (or login) and avatar when signed in,
 * otherwise the locally chosen name.
 */
export function localCollabUser(
  localName: string,
  color: Color,
  identity: GitHubIdentity | null
): CollabUser {
  if (!identity) return { name: displayName(localName), color }
  const user: CollabUser = {
    name: displayName(identity.name || identity.login),
    color,
    login: identity.login
  }
  const avatar = safeAvatarURL(identity.avatarURL)
  if (avatar) user.avatar = avatar
  return user
}

const Channel = v.pipe(v.number(), v.minValue(0), v.maxValue(1))

/** Untrusted peer presence: each field falls back to undefined when it does not validate. */
const PeerUserSchema = v.object({
  name: v.fallback(v.optional(v.string()), undefined),
  color: v.fallback(v.optional(v.object({ r: Channel, g: Channel, b: Channel })), undefined),
  login: v.fallback(v.optional(v.string()), undefined),
  avatar: v.fallback(v.optional(v.string()), undefined)
})

export type PeerUser = { name?: string; color?: Color; login?: string; avatar?: string }

/** A peer's `user` field, validated: unknown or unsafe values are dropped. */
export function parseCollabUser(value: unknown): PeerUser | null {
  const parsed = v.safeParse(PeerUserSchema, value)
  if (!parsed.success) return null
  const user = parsed.output
  return {
    name: user.name === undefined ? undefined : displayName(user.name),
    color: user.color ? { ...user.color, a: 1 } : undefined,
    login: safeLogin(user.login),
    avatar: safeAvatarURL(user.avatar) ?? undefined
  }
}
