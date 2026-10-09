import { useLocalStorage } from '@vueuse/core'
import * as v from 'valibot'

import type { GitHubUser } from './client'

/**
 * The signed-in GitHub account, without any secret. Collaboration presence and comments
 * can read it to show who is editing.
 */
const IdentitySchema = v.object({
  id: v.number(),
  login: v.string(),
  name: v.nullable(v.string()),
  avatarURL: v.string(),
  method: v.picklist(['oauth', 'token'])
})

export type GitHubIdentity = v.InferOutput<typeof IdentitySchema>

export const githubIdentity = useLocalStorage<GitHubIdentity | null>(
  'open-pencil:storage:github:identity',
  null,
  {
    serializer: {
      read: (raw) => {
        try {
          const parsed = v.safeParse(IdentitySchema, JSON.parse(raw))
          return parsed.success ? parsed.output : null
        } catch {
          return null
        }
      },
      write: (value) => JSON.stringify(value)
    }
  }
)

export function identityFromUser(
  user: GitHubUser,
  method: GitHubIdentity['method']
): GitHubIdentity {
  return {
    id: user.id,
    login: user.login,
    name: user.name ?? null,
    avatarURL: user.avatar_url,
    method
  }
}
