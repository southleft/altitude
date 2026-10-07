import type { Canvas, Image } from 'canvaskit-wasm'

import { ResourceCache } from '#core/cache/resource'

import type { SkiaRenderer } from './renderer'

/** Decoded avatars kept per renderer; collaboration rooms rarely exceed this many peers. */
const MAX_AVATAR_IMAGES = 32

/**
 * Decoded remote-cursor avatars by source key. A failed decode is cached as null so bad
 * bytes are not decoded again every frame.
 */
export function createCursorAvatarCache() {
  return new ResourceCache<string, Image | null>({
    maxEntries: MAX_AVATAR_IMAGES,
    dispose: (image) => image?.delete()
  })
}

export type CursorAvatarCache = ReturnType<typeof createCursorAvatarCache>

function avatarImage(r: SkiaRenderer, avatar: { key: string; bytes: Uint8Array }): Image | null {
  const cached = r.cursorAvatarCache.get(avatar.key)
  if (cached !== undefined) return cached
  const image = r.ck.MakeImageFromEncoded(avatar.bytes)
  r.cursorAvatarCache.set(avatar.key, image)
  return image
}

/**
 * Draw `avatar` as a circle of `size` screen pixels at (`x`, `y`) (top-left). Returns
 * false when the bytes could not be decoded, so the caller can lay out without it.
 */
export function drawCursorAvatar(
  r: SkiaRenderer,
  canvas: Canvas,
  avatar: { key: string; bytes: Uint8Array },
  x: number,
  y: number,
  size: number
): boolean {
  const image = avatarImage(r, avatar)
  if (!image) return false
  const radius = size / 2
  const dest = r.ck.XYWHRect(x, y, size, size)
  canvas.save()
  canvas.clipRRect(r.ck.RRectXY(dest, radius, radius), r.ck.ClipOp.Intersect, true)
  canvas.drawImageRectOptions(
    image,
    r.ck.XYWHRect(0, 0, image.width(), image.height()),
    dest,
    r.ck.FilterMode.Linear,
    r.ck.MipmapMode.None,
    null
  )
  canvas.restore()
  return true
}

/** Whether `avatar` decodes, without drawing; used to size the name pill first. */
export function hasDrawableCursorAvatar(
  r: SkiaRenderer,
  avatar: { key: string; bytes: Uint8Array } | undefined
): avatar is { key: string; bytes: Uint8Array } {
  return !!avatar && avatarImage(r, avatar) !== null
}
