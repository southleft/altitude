import { shallowRef } from 'vue'

import { storageMessages } from '@open-pencil/vue'

import type { EditorStore } from '@/app/editor/active-store'
import { openSettingsDialog } from '@/app/settings/dialog'
import { toast } from '@/app/shell/ui'

import { githubIdentity } from '../identity'
import { readGitHubPreferences } from '../preferences'

/**
 * Set when a command asks the commit popover to open. The popover consumes it, including
 * after it mounts because the request also revealed a hidden editor UI.
 */
export const githubCommitPromptPending = shallowRef(false)

/** Signed in and pointed at a repository, so a document can be committed. */
export function isGitHubReady(): boolean {
  const preferences = readGitHubPreferences()
  return githubIdentity.value !== null && preferences.owner !== '' && preferences.repo !== ''
}

/** Open the commit popover in the properties panel header, showing the editor UI if hidden. */
export function openGitHubCommitPrompt(store: EditorStore): void {
  store.state.showUI = true
  githubCommitPromptPending.value = true
}

/** File › Save to GitHub…: the commit popover, or Settings when GitHub is not set up yet. */
export function saveToGitHub(store: EditorStore): void {
  if (!isGitHubReady()) {
    openSettingsDialog('github')
    return
  }
  openGitHubCommitPrompt(store)
}

/**
 * Plain Save. A GitHub-bound document commits; any other document saves to its file as
 * before. When GitHub is ready, the first file save of a document points out Save to
 * GitHub once, without blocking or repeating.
 */
export async function saveDocument(store: EditorStore): Promise<boolean> {
  const bound = store.github.binding.value !== null
  const saved = await store.saveFigFile()
  if (saved && !bound && isGitHubReady() && store.github.claimSaveHint()) {
    const messages = storageMessages.get()
    toast.info(messages.githubSaveHint, {
      label: messages.githubSaveToRepository,
      run: () => openGitHubCommitPrompt(store)
    })
  }
  return saved
}
