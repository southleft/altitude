/**
 * Write access to a File System Access handle. `showOpenFilePicker` grants read access only, and
 * `createWritable()` on such a handle implicitly requests read-write access, which Chromium
 * refuses unless the page still holds transient user activation. A save that first spends seconds
 * exporting a large document has lost that activation by the time it writes, so user-initiated
 * saves request access up front and background writes only proceed when access is already granted.
 */
const READ_WRITE: FileSystemHandlePermissionDescriptor = { mode: 'readwrite' }

/** The engine cannot report permission state; `createWritable()` remains the only signal. */
export type HandleWritePermission = PermissionState | 'unsupported'

/** Reads the current read-write permission without prompting or needing user activation. */
export async function queryHandleWritePermission(
  handle: FileSystemFileHandle
): Promise<HandleWritePermission> {
  if (typeof handle.queryPermission !== 'function') return 'unsupported'
  try {
    return await handle.queryPermission(READ_WRITE)
  } catch {
    return 'prompt'
  }
}

/**
 * Whether a write can proceed without showing a permission prompt. Autosave and other background
 * writes use this so they never prompt or fail outside a user gesture.
 */
export async function canWriteHandleSilently(handle: FileSystemFileHandle): Promise<boolean> {
  const permission = await queryHandleWritePermission(handle)
  return permission === 'granted' || permission === 'unsupported'
}

/**
 * Ensures read-write access for a user-initiated save. Call it before any slow work so the prompt
 * still runs inside the gesture's activation window. Resolves to false when the user declines or
 * the browser refuses to prompt (for example, without user activation).
 */
export async function requestHandleWriteAccess(handle: FileSystemFileHandle): Promise<boolean> {
  const permission = await queryHandleWritePermission(handle)
  if (permission === 'granted' || permission === 'unsupported') return true
  if (permission === 'denied' || typeof handle.requestPermission !== 'function') return false
  try {
    return (await handle.requestPermission(READ_WRITE)) === 'granted'
  } catch {
    return false
  }
}
