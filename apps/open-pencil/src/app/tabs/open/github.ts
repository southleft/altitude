import type { EditorStore } from '@/app/editor/session'
import {
  currentDraftPolicy,
  preferredDocumentLocation
} from '@/app/integrations/storage/github/document/draft'
import { readGitHubPreferences } from '@/app/integrations/storage/github/preferences'
import {
  loadGitHubDocument,
  type GitHubDocumentBinding,
  type GitHubDocumentSummary,
  type GitHubRepositoryLocation
} from '@/app/integrations/storage/github/repository'
import { resolveGitHubClient } from '@/app/integrations/storage/github/runtime'
import { getTabsSnapshot, switchTab } from '@/app/tabs'
import { openExternalDocumentInTab } from '@/app/tabs/open/external'

/** The same document in the same repository, on whichever branch the tab has it. */
function sameDocument(
  binding: GitHubDocumentBinding,
  location: GitHubRepositoryLocation,
  path: string
) {
  return binding.owner === location.owner && binding.repo === location.repo && binding.path === path
}

async function loadInto(
  location: GitHubRepositoryLocation,
  path: string,
  name: string,
  target?: EditorStore
): Promise<EditorStore> {
  let loaded: Awaited<ReturnType<typeof loadGitHubDocument>> | null = null
  return openExternalDocumentInTab({
    name,
    target,
    async read(signal) {
      loaded = await loadGitHubDocument(
        await resolveGitHubClient(undefined, signal),
        location,
        path
      )
      return loaded.graph
    },
    bind(store) {
      if (!loaded) return
      store.setDocumentSource(`${loaded.name}.json`, 'openpencil-json')
      store.state.documentName = loaded.name
      store.github.bind(loaded.binding)
    }
  })
}

/**
 * Open a document from the configured repository, or focus the tab that has it open. With
 * autosave on, the signed-in person's draft branch wins when it already has the document.
 */
export async function openGitHubDocumentInNewTab(document: GitHubDocumentSummary): Promise<void> {
  const preferences = readGitHubPreferences()
  const listed = { owner: preferences.owner, repo: preferences.repo, branch: preferences.branch }
  const existing = getTabsSnapshot().find((tab) => {
    const binding = tab.store.github.binding.value
    return binding !== null && sameDocument(binding, listed, document.path)
  })
  if (existing) {
    switchTab(existing.id)
    return
  }
  const location = await preferredDocumentLocation(
    await resolveGitHubClient(),
    listed,
    document.path,
    currentDraftPolicy()
  )
  await loadInto(location, document.path, document.name)
}

/** Replace this tab's document with the latest commit on its branch, dropping local edits. */
export async function reloadGitHubDocument(store: EditorStore): Promise<void> {
  const binding = store.github.binding.value
  if (!binding) return
  await loadInto(binding, binding.path, store.state.documentName, store)
}

/** Replace this tab's document with its version at `location` (another branch). */
export async function loadGitHubDocumentAt(
  store: EditorStore,
  location: GitHubRepositoryLocation,
  path: string
): Promise<void> {
  await loadInto(location, path, store.state.documentName, store)
}
