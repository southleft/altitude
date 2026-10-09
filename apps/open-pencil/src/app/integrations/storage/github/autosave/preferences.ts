import { useLocalStorage } from '@vueuse/core'

/**
 * Settings → Version control → Autosave to GitHub. On by default: GitHub-bound documents
 * commit to their draft branch after edits settle. A non-secret preference.
 */
export const githubAutosaveEnabled = useLocalStorage<boolean>(
  'open-pencil:storage:github:autosave',
  true
)
