import type { CommentAnchor } from '@/app/integrations/storage/github/comments/anchor'
import type { CommentPanelSections } from '@/app/integrations/storage/github/comments/pins'
import type {
  CommentReply,
  CommentThread
} from '@/app/integrations/storage/github/comments/repository'

/** Deterministic comment threads for Storybook; avatars fall back to initials offline. */
const anchor: CommentAnchor = {
  doc: 'documents/landing-page',
  page: '0:1',
  node: '12:34',
  x: 120,
  y: 80,
  dx: 4,
  dy: 6,
  branch: 'design/landing-page-ab12',
  commit: 'a'.repeat(40)
}

export const storyThreads: CommentThread[] = [
  {
    number: 41,
    url: 'https://github.com/southleft/altitude-designs/issues/41',
    title: 'Tighten the spacing under the hero title',
    body: 'Tighten the spacing under the hero title.\n\nIt should match the **8px** rhythm used elsewhere.',
    state: 'open',
    author: { login: 'octo', avatarURL: '', url: null },
    createdAt: '2026-10-07T09:00:00Z',
    updatedAt: '2026-10-07T09:30:00Z',
    replyCount: 2,
    anchor
  },
  {
    number: 38,
    url: 'https://github.com/southleft/altitude-designs/issues/38',
    title: 'Use the brand blue for the primary button',
    body: 'Use the brand blue for the primary button.',
    state: 'closed',
    author: { login: 'cat', avatarURL: '', url: null },
    createdAt: '2026-10-05T14:00:00Z',
    updatedAt: '2026-10-06T10:00:00Z',
    replyCount: 0,
    anchor
  }
]

export const storyReplies: CommentReply[] = [
  {
    id: 1,
    url: 'https://github.com/southleft/altitude-designs/issues/41#issuecomment-1',
    body: 'Agreed — I will update the layout grid.',
    author: { login: 'cat', avatarURL: '', url: null },
    createdAt: '2026-10-07T09:10:00Z'
  },
  {
    id: 2,
    url: 'https://github.com/southleft/altitude-designs/issues/41#issuecomment-2',
    body: 'Done on `design/landing-page-ab12`.',
    author: { login: 'octo', avatarURL: '', url: null },
    createdAt: '2026-10-07T09:30:00Z'
  }
]

export const storySections: CommentPanelSections<CommentThread> = {
  page: [storyThreads[0]],
  orphaned: [{ ...storyThreads[1], number: 39, state: 'open', title: 'This icon looks blurry' }],
  otherPages: [{ thread: storyThreads[1], pageName: 'Components' }]
}

export const emptySections: CommentPanelSections<CommentThread> = {
  page: [],
  orphaned: [],
  otherPages: []
}
