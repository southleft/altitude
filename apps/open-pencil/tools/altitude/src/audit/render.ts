import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { computeContentBounds, headlessRenderNodes, initCanvasKit } from '@open-pencil/core/io'
import { slugify, type DocumentDiff } from '@open-pencil/core/io/formats/document-json'
import { prepareGraphFonts } from '@open-pencil/core/text'
import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'

/**
 * Before/after PNGs of what a change touched: every changed page a designer sees, and every
 * changed component or component set (cropped to it). Both sides render at one scale over
 * the union of their bounds, so the longer side stays at most `maxDimension` pixels and a
 * diff image can mark the changed pixels in red over a faded copy of the head render.
 */

export interface RenderOptions {
  /** Longest side of a render, in pixels. */
  maxDimension?: number
  /** Changed components rendered per document. */
  maxComponents?: number
}

export interface RenderPair {
  kind: 'page' | 'component'
  label: string
  /** Paths relative to the output directory, `/`-separated. */
  base: string | null
  head: string | null
  diff: string | null
  /** Share of pixels that differ, when both sides rendered. */
  changedPercent: number | null
}

interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

interface Side {
  graph: SceneGraph
  pageId: string
  nodeIds: string[]
  bounds: Bounds
}

interface Rendered {
  png: Uint8Array
  /** Pixel offset of this render inside the union frame. */
  x: number
  y: number
}

type CanvasKit = Awaited<ReturnType<typeof initCanvasKit>>

const DEFAULT_MAX_DIMENSION = 1600
const DEFAULT_MAX_COMPONENTS = 6
/** Renders never upscale past this, so small components stay crisp but cheap. */
const MAX_SCALE = 2
/** Per-channel difference below which a pixel counts as unchanged (anti-aliasing noise). */
const PIXEL_TOLERANCE = 24

function pageOf(graph: SceneGraph, node: SceneNode): SceneNode | null {
  for (
    let current: SceneNode | undefined = node;
    current;
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  ) {
    if (current.type === 'CANVAS') return current
  }
  return null
}

function side(graph: SceneGraph | null, pageId: string | null, nodeIds: string[]): Side | null {
  if (!graph || !pageId || nodeIds.length === 0) return null
  const bounds = computeContentBounds(graph, nodeIds)
  if (!bounds || bounds.maxX <= bounds.minX || bounds.maxY <= bounds.minY) return null
  return { graph, pageId, nodeIds, bounds }
}

function pageSide(graph: SceneGraph | null, pageId: string): Side | null {
  if (!graph?.getNode(pageId)) return null
  const ids = graph.getChildren(pageId).flatMap((child) => (child.visible ? [child.id] : []))
  return side(graph, pageId, ids)
}

function nodeSide(graph: SceneGraph | null, id: string): Side | null {
  const node = graph?.getNode(id)
  const page = node && graph ? pageOf(graph, node) : null
  return side(graph, page?.id ?? null, [id])
}

async function renderSide(
  current: Side | null,
  union: Bounds,
  scale: number
): Promise<Rendered | null> {
  if (!current) return null
  try {
    await prepareGraphFonts(current.graph, current.nodeIds)
  } catch (error) {
    // Missing fonts render with fallbacks; the audit is still useful.
    console.warn(
      `Fonts not loaded for render: ${error instanceof Error ? error.message : String(error)}`
    )
  }
  const png = await headlessRenderNodes(current.graph, current.pageId, current.nodeIds, {
    scale,
    format: 'PNG'
  })
  if (!png) return null
  return {
    png,
    x: Math.round((current.bounds.minX - union.minX) * scale),
    y: Math.round((current.bounds.minY - union.minY) * scale)
  }
}

function readRGBA(ck: CanvasKit, png: Uint8Array) {
  const image = ck.MakeImageFromEncoded(png)
  if (!image) return null
  const width = image.width()
  const height = image.height()
  const pixels = image.readPixels(0, 0, {
    width,
    height,
    colorType: ck.ColorType.RGBA_8888,
    alphaType: ck.AlphaType.Unpremul,
    colorSpace: ck.ColorSpace.SRGB
  })
  image.delete()
  if (!pixels) return null
  return {
    width,
    height,
    pixels: new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength)
  }
}

/** An opaque RGB frame (white) with `image` composited at its offset. */
function frame(ck: CanvasKit, image: Rendered, width: number, height: number): Uint8Array | null {
  const decoded = readRGBA(ck, image.png)
  if (!decoded) return null
  const out = new Uint8Array(width * height * 3).fill(255)
  for (let y = 0; y < decoded.height; y++) {
    const ty = y + image.y
    if (ty < 0 || ty >= height) continue
    for (let x = 0; x < decoded.width; x++) {
      const tx = x + image.x
      if (tx < 0 || tx >= width) continue
      const from = (y * decoded.width + x) * 4
      const to = (ty * width + tx) * 3
      const alpha = decoded.pixels[from + 3] / 255
      for (let channel = 0; channel < 3; channel++) {
        out[to + channel] = Math.round(decoded.pixels[from + channel] * alpha + 255 * (1 - alpha))
      }
    }
  }
  return out
}

/** Red where the two renders differ, a faded head render elsewhere. */
export async function pixelDiff(
  base: Rendered,
  head: Rendered,
  width: number,
  height: number
): Promise<{ png: Uint8Array; changedPercent: number } | null> {
  const ck = await initCanvasKit()
  const before = frame(ck, base, width, height)
  const after = frame(ck, head, width, height)
  if (!before || !after) return null
  const out = new Uint8Array(width * height * 4)
  let changed = 0
  for (let pixel = 0; pixel < width * height; pixel++) {
    const rgb = pixel * 3
    let differs = false
    for (let channel = 0; channel < 3; channel++) {
      if (Math.abs(before[rgb + channel] - after[rgb + channel]) > PIXEL_TOLERANCE) differs = true
    }
    if (differs) {
      changed++
      out.set([230, 30, 60, 255], pixel * 4)
    } else {
      const luma = (after[rgb] + after[rgb + 1] + after[rgb + 2]) / 3
      const grey = Math.round(255 - (255 - luma) * 0.25)
      out.set([grey, grey, grey, 255], pixel * 4)
    }
  }
  const image = ck.MakeImage(
    {
      width,
      height,
      colorType: ck.ColorType.RGBA_8888,
      alphaType: ck.AlphaType.Unpremul,
      colorSpace: ck.ColorSpace.SRGB
    },
    out,
    width * 4
  )
  const png = image?.encodeToBytes(ck.ImageFormat.PNG, 100) ?? null
  image?.delete()
  if (!png) return null
  return { png, changedPercent: Math.round((changed / (width * height)) * 10000) / 100 }
}

async function save(outDir: string, path: string, bytes: Uint8Array): Promise<string> {
  const file = join(outDir, ...path.split('/'))
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, bytes)
  return path
}

async function renderPair(
  outDir: string,
  prefix: string,
  kind: RenderPair['kind'],
  label: string,
  before: Side | null,
  after: Side | null,
  maxDimension: number
): Promise<RenderPair | null> {
  const union = [before, after].reduce<Bounds | null>((acc, current) => {
    if (!current) return acc
    if (!acc) return { ...current.bounds }
    return {
      minX: Math.min(acc.minX, current.bounds.minX),
      minY: Math.min(acc.minY, current.bounds.minY),
      maxX: Math.max(acc.maxX, current.bounds.maxX),
      maxY: Math.max(acc.maxY, current.bounds.maxY)
    }
  }, null)
  if (!union) return null
  const longest = Math.max(union.maxX - union.minX, union.maxY - union.minY)
  const scale = Math.min(MAX_SCALE, maxDimension / longest)
  const base = await renderSide(before, union, scale)
  const head = await renderSide(after, union, scale)
  if (!base && !head) return null
  const width = Math.ceil((union.maxX - union.minX) * scale)
  const height = Math.ceil((union.maxY - union.minY) * scale)
  const diff = base && head ? await pixelDiff(base, head, width, height) : null
  if (diff?.changedPercent === 0) return null // re-saved without a visible change
  return {
    kind,
    label,
    base: base ? await save(outDir, `${prefix}.base.png`, base.png) : null,
    head: head ? await save(outDir, `${prefix}.head.png`, head.png) : null,
    diff: diff ? await save(outDir, `${prefix}.diff.png`, diff.png) : null,
    changedPercent: diff?.changedPercent ?? null
  }
}

/** Render the pages and components `diff` reports as changed into `outDir/<slug>/…`. */
export async function renderChanges(
  base: SceneGraph | null,
  head: SceneGraph | null,
  diff: DocumentDiff,
  slug: string,
  outDir: string,
  options: RenderOptions = {}
): Promise<RenderPair[]> {
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION
  const maxComponents = options.maxComponents ?? DEFAULT_MAX_COMPONENTS
  const pairs: RenderPair[] = []
  for (const page of diff.pages) {
    if (page.internal) continue
    const prefix = `${slug}/page-${slugify(page.name, 'page')}-${slugify(page.id, 'id')}`
    const rendered = await renderPair(
      outDir,
      prefix,
      'page',
      page.name,
      pageSide(base, page.id),
      pageSide(head, page.id),
      maxDimension
    )
    if (rendered) pairs.push(rendered)
  }

  const components = [...new Set(diff.pages.flatMap((page) => page.changedComponents))]
  for (const id of components.slice(0, maxComponents)) {
    const node = head?.getNode(id) ?? base?.getNode(id)
    if (!node) continue
    const prefix = `${slug}/component-${slugify(node.name, 'component')}-${slugify(id, 'id')}`
    const rendered = await renderPair(
      outDir,
      prefix,
      'component',
      node.name,
      nodeSide(base, id),
      nodeSide(head, id),
      maxDimension / 2
    )
    if (rendered) pairs.push(rendered)
  }
  return pairs
}
