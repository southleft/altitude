import { GITHUB_AVATAR_ORIGIN } from '@/app/collab/identity'

/** Avatar bytes larger than this are not drawn. */
const MAX_AVATAR_BYTES = 256 * 1024
const MAX_CACHED_AVATARS = 64

export type AvatarFetch = (url: string, init: RequestInit) => Promise<Response>

/**
 * Downloads GitHub avatars for canvas cursors, once per URL. Only URLs already validated by
 * `safeAvatarURL` are requested; responses must be images under 256 KB. Failures are
 * remembered as null so a broken avatar is not retried on every awareness update.
 */
export function createAvatarCache(fetcher: AvatarFetch = (url, init) => fetch(url, init)) {
  const settled = new Map<string, Uint8Array | null>()
  const inflight = new Map<string, Promise<Uint8Array | null>>()

  async function download(url: string): Promise<Uint8Array | null> {
    if (!url.startsWith(`${GITHUB_AVATAR_ORIGIN}/`)) return null
    try {
      const response = await fetcher(url, {
        mode: 'cors',
        credentials: 'omit',
        referrerPolicy: 'no-referrer'
      })
      if (!response.ok) return null
      if (!(response.headers.get('content-type') ?? '').startsWith('image/')) return null
      const length = Number(response.headers.get('content-length') ?? '0')
      if (length > MAX_AVATAR_BYTES) return null
      const bytes = new Uint8Array(await response.arrayBuffer())
      return bytes.byteLength > 0 && bytes.byteLength <= MAX_AVATAR_BYTES ? bytes : null
    } catch {
      return null
    }
  }

  function remember(url: string, bytes: Uint8Array | null) {
    if (settled.size >= MAX_CACHED_AVATARS) {
      const oldest = settled.keys().next().value
      if (oldest !== undefined) settled.delete(oldest)
    }
    settled.set(url, bytes)
  }

  return {
    /** Loaded bytes, null after a failure, undefined while unknown or loading. */
    peek(url: string): Uint8Array | null | undefined {
      return settled.get(url)
    },
    /** Start (or join) the download of `url`; resolves once it settled. */
    request(url: string): Promise<Uint8Array | null> {
      const known = settled.get(url)
      if (known !== undefined) return Promise.resolve(known)
      let pending = inflight.get(url)
      if (!pending) {
        pending = download(url).then((bytes) => {
          inflight.delete(url)
          remember(url, bytes)
          return bytes
        })
        inflight.set(url, pending)
      }
      return pending
    }
  }
}

export type AvatarCache = ReturnType<typeof createAvatarCache>

/** The app's avatar cache, shared by every collaboration session. */
export const collabAvatars = createAvatarCache()
