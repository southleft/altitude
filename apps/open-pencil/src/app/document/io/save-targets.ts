import { pickBrowserSaveFile } from '@/app/document/io/capability'

export async function chooseTauriFigSavePath() {
  const { save } = await import('@tauri-apps/plugin-dialog')
  return save({
    defaultPath: 'Untitled.fig',
    filters: [{ name: 'Figma file', extensions: ['fig'] }]
  })
}

/**
 * Outcome of the browser save picker. `unavailable` covers both a browser without File System
 * Access and a picker the browser refused to show (it needs transient user activation), so the
 * caller can fall back to a download; `cancelled` means the user dismissed the picker.
 */
export type BrowserFigSaveTarget =
  | { kind: 'handle'; handle: FileSystemFileHandle }
  | { kind: 'cancelled' }
  | { kind: 'unavailable' }

function errorName(error: unknown) {
  return typeof error === 'object' && error !== null && 'name' in error ? error.name : undefined
}

function isPickerRefusal(error: unknown) {
  const name = errorName(error)
  return name === 'SecurityError' || name === 'NotAllowedError'
}

export async function chooseBrowserFigSaveTarget(
  suggestedName = 'Untitled.fig'
): Promise<BrowserFigSaveTarget> {
  try {
    const handle = await pickBrowserSaveFile({
      suggestedName,
      types: [
        {
          description: 'Figma file',
          accept: { 'application/octet-stream': ['.fig'] }
        }
      ]
    })
    return handle ? { kind: 'handle', handle } : { kind: 'unavailable' }
  } catch (error) {
    if (errorName(error) === 'AbortError') return { kind: 'cancelled' }
    if (isPickerRefusal(error)) return { kind: 'unavailable' }
    throw error
  }
}
