import { expect, test } from 'bun:test'

import {
  githubSaveIndicator,
  type GitHubSaveIndicatorInput
} from '@/app/integrations/storage/github/autosave/indicator'
import type { GitHubDocumentBinding } from '@/app/integrations/storage/github/repository'

const binding: GitHubDocumentBinding = {
  owner: 'southleft',
  repo: 'altitude-designs',
  branch: 'design/landing-page/octo',
  path: 'documents/landing-page',
  commitSHA: 'abc1234def',
  committedAt: '2026-10-09T12:00:00Z',
  files: { 'document.json': 'x' }
}

function input(overrides: Partial<GitHubSaveIndicatorInput> = {}): GitHubSaveIndicatorInput {
  return {
    binding,
    dirty: false,
    status: { phase: 'idle' },
    autosave: { phase: 'idle' },
    online: true,
    ...overrides
  }
}

const network = { kind: 'network' as const, message: 'offline', resetAt: null }
const rateLimited = { kind: 'rate-limited' as const, message: 'slow down', resetAt: null }

test('a clean bound document shows its last commit with a link', () => {
  expect(githubSaveIndicator(input())).toEqual({
    kind: 'committed',
    committedAt: binding.committedAt,
    commitURL: 'https://github.com/southleft/altitude-designs/commit/abc1234def'
  })
})

test('edits not yet committed are unsaved; unbound documents offer Save to GitHub', () => {
  expect(githubSaveIndicator(input({ dirty: true })).kind).toBe('unsaved')
  expect(githubSaveIndicator(input({ binding: null, dirty: true })).kind).toBe('unpublished')
})

test('a commit or autosave in progress is saving', () => {
  const working = { phase: 'working', operation: 'commit', origin: 'autosave' } as const
  expect(githubSaveIndicator(input({ dirty: true, status: working })).kind).toBe('saving')
  expect(githubSaveIndicator(input({ dirty: true, autosave: { phase: 'running' } })).kind).toBe(
    'saving'
  )
})

test('network failures and an offline browser keep edits locally', () => {
  const failed = { phase: 'failed', failure: network, origin: 'autosave' } as const
  expect(
    githubSaveIndicator(
      input({
        dirty: true,
        status: failed,
        autosave: { phase: 'backoff', retryAt: 90_000, attempts: 1 }
      })
    )
  ).toEqual({ kind: 'offline', retryAt: 90_000 })
  expect(githubSaveIndicator(input({ dirty: true, online: false }))).toEqual({
    kind: 'offline',
    retryAt: null
  })
})

test('other failures and conflicts need attention', () => {
  const failed = { phase: 'failed', failure: rateLimited, origin: 'autosave' } as const
  expect(githubSaveIndicator(input({ dirty: true, status: failed }))).toEqual({
    kind: 'failed',
    failure: rateLimited,
    conflict: false
  })
  const conflict = {
    phase: 'conflict',
    paths: ['pages/cover.json'],
    remoteCommitSHA: 'f',
    origin: 'user'
  } as const
  expect(githubSaveIndicator(input({ dirty: true, status: conflict }))).toEqual({
    kind: 'failed',
    failure: null,
    conflict: true
  })
})

test('a stale failure on a clean document no longer shows', () => {
  const failed = { phase: 'failed', failure: rateLimited, origin: 'autosave' } as const
  expect(githubSaveIndicator(input({ status: failed })).kind).toBe('committed')
})
