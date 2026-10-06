#!/usr/bin/env node
/**
 * Conformance gap report.
 *
 * Option C says every element carries two facts: what it IS (scene graph) and what it
 * MEANS (CSS). Anything that cannot carry both is a NAMED degradation, never a silent
 * drop. This script produces that list of names.
 *
 * It diffs the SceneNode property surface against the properties the dom-css bridge
 * actually touches in each direction, and buckets what is left by theme so the gap can
 * be worked down in priority order rather than discovered one surprise at a time.
 *
 * Source-derived and re-runnable: as mappings land, the numbers here move on their own.
 *
 *   node scripts/conformance/gap-report.mjs            # write .slate/CONFORMANCE.md
 *   node scripts/conformance/gap-report.mjs --check    # exit 1 if the report is stale
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, '.slate', 'CONFORMANCE.md')

const SCENE_TYPES = join(ROOT, 'packages/scene-graph/src/types.ts')
// The import side spans two modules: `to-scene-graph` owns document structure and
// `apply-css` owns value translation. Reading only the first made 55 properties look
// one-way the moment they were split apart.
const TO_SCENE = join(ROOT, 'packages/dom-css/src/to-scene-graph.ts')
const APPLY_CSS = join(ROOT, 'packages/dom-css/src/apply-css.ts')
const FROM_SCENE = join(ROOT, 'packages/dom-css/src/from-scene-graph.ts')
const DESIGN_FACT = join(ROOT, 'packages/dom-css/src/design-fact.ts')

const read = (p) => readFileSync(p, 'utf8')

/**
 * Properties carried by the design-fact carrier rather than by CSS.
 *
 * Counting only the CSS mapping made this report claim 45% coverage while the measured
 * round trip was at 99.9% — the report was blind to the carrier that closed the gap. A
 * property is bridged if it comes home, not if it comes home a particular way.
 */
function factCarriedProperties() {
  const src = read(DESIGN_FACT)
  const carried = new Set()

  // RESIDUAL_FIELDS: the explicit allow-list of CSS-inexpressible facts.
  const block = /const RESIDUAL_FIELDS = \[([\s\S]*?)\] as const/.exec(src)
  if (!block) throw new Error('RESIDUAL_FIELDS not found — design-fact.ts shape changed')
  for (const m of block[1].matchAll(/'([a-zA-Z][a-zA-Z0-9]*)'/g)) carried.add(m[1])

  // Facts with a dedicated field on DesignFact rather than a slot in the residual bag.
  for (const field of [
    'name',
    'componentId',
    'componentKey',
    'boundVariables',
    'variableModes',
    'fills',
    'strokes',
    'effects',
    'x',
    'y',
    'type'
  ]) {
    carried.add(field)
  }

  // Shared-style ids are carried through STYLE_ID_FIELDS.
  const styleBlock = /const STYLE_ID_FIELDS = \[([\s\S]*?)\] as const/.exec(src)
  for (const m of (styleBlock?.[1] ?? '').matchAll(/'([a-zA-Z]+StyleId)'/g)) carried.add(m[1])

  return carried
}

/** Property names declared on the SceneNode interface. */
function sceneNodeProperties() {
  const src = read(SCENE_TYPES)
  const start = src.indexOf('export interface SceneNode')
  if (start === -1) throw new Error(`SceneNode interface not found in ${SCENE_TYPES}`)

  // Walk braces from the interface body so we stop at its real end, not the next `}`.
  const open = src.indexOf('{', start)
  let depth = 0
  let end = open
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}' && --depth === 0) {
      end = i
      break
    }
  }

  const body = src.slice(open + 1, end)
  const props = new Set()
  for (const line of body.split('\n')) {
    // Only top-level members: exactly one indent level, `name?: type`.
    const m = /^ {2}([a-zA-Z][a-zA-Z0-9]*)\??:/.exec(line)
    if (m) props.add(m[1])
  }
  if (props.size === 0) throw new Error('parsed zero SceneNode properties — the shape changed')
  return props
}

/**
 * Names pulled out of a destructuring pattern bound to a scene node, e.g.
 * `const { paddingTop, paddingRight: pr } = node`. Missing these was the first bug in
 * this script: it reported padding as unmapped when it round-trips fine, because the
 * access is destructured rather than a `node.x` member expression. A gap list that
 * cries wolf is worse than no gap list.
 */
function destructuredFrom(src) {
  const out = new Set()
  for (const m of src.matchAll(/\{([^{}]*)\}\s*=\s*node\b/g)) {
    for (const part of m[1].split(',')) {
      // `paddingRight: pr` binds a new name but still READS paddingRight.
      const name = /^\s*([a-zA-Z][a-zA-Z0-9]*)/.exec(part)
      if (name) out.add(name[1])
    }
  }
  return out
}

/** Properties the bridge writes when turning HTML/CSS into scene nodes. */
function propertiesWritten() {
  const src = [read(TO_SCENE), read(APPLY_CSS)].join('\n')
  const out = new Set()
  for (const m of src.matchAll(/node\.([a-zA-Z][a-zA-Z0-9]*)\s*=[^=]/g)) out.add(m[1])
  // `Object.assign(node, { ... })` writes every key in the literal.
  for (const m of src.matchAll(/Object\.assign\(\s*node\s*,\s*\{([^{}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const name = /^\s*([a-zA-Z][a-zA-Z0-9]*)\s*[:,}]?/.exec(part)
      if (name) out.add(name[1])
    }
  }
  return out
}

/** Properties the bridge reads when turning scene nodes back into HTML/CSS. */
function propertiesRead() {
  const src = read(FROM_SCENE)
  const out = new Set()
  for (const m of src.matchAll(/node\.([a-zA-Z][a-zA-Z0-9]*)\b/g)) out.add(m[1])
  for (const name of destructuredFrom(src)) out.add(name)
  return out
}

/**
 * Properties whose name appears somewhere in a file but that structured detection did
 * not claim. These are where this script is UNSURE, and it says so rather than
 * asserting a gap it cannot prove. Every entry is either a real miss in the detector
 * or an incidental mention; both deserve eyes.
 */
function mentionedButUndetected(props, detected, src) {
  return [...props]
    .filter((p) => !detected.has(p))
    .filter((p) => new RegExp(`\\b${p}\\b`).test(src))
    .sort()
}

/**
 * Themes, in the order we intend to close them. `why` states the consequence of the gap
 * in terms of what a user loses, not in terms of the property name.
 */
const THEMES = [
  {
    id: 'variables',
    title: 'Variables and tokens',
    why: 'A token bound in the design becomes a frozen literal in the code. The link between design and theme is severed on every round trip — this is the gap that matters most.',
    match: ['boundVariables', 'variableModes']
  },
  {
    id: 'shared-styles',
    title: 'Shared styles',
    why: 'Styles applied by reference collapse into inline values, so editing the style no longer moves what it styled.',
    match: (p) => p.endsWith('StyleId') || p === 'sharedStyleType'
  },
  {
    id: 'components',
    title: 'Components, variants and instances',
    why: 'Instances flatten into ordinary boxes. Variant axes and property definitions have no CSS equivalent and need a convention invented for them.',
    match: (p) =>
      p.startsWith('component') ||
      p.startsWith('variant') ||
      p === 'instanceOverrides' ||
      p === 'overrideKey'
  },
  {
    id: 'transform',
    title: 'Transforms',
    why: 'CSS can express all of these today (transform, rotate, scaleX/Y). Cheapest real win on the board.',
    match: ['rotation', 'flipX', 'flipY', 'cornerSmoothing']
  },
  {
    id: 'grid',
    title: 'Grid and sizing',
    why: 'The layout engine already does CSS Grid, but the CSS bridge never reads or writes it — grid frames round-trip as plain boxes.',
    match: (p) =>
      p.startsWith('grid') || p.endsWith('Sizing') || /^layout(Grids|Grow|Direction)$/.test(p)
  },
  {
    id: 'constraints',
    title: 'Constraints and stacking',
    why: 'Resize behaviour and paint order are lost; a resized frame will not reflow the way the designer set it up to.',
    match: ['horizontalConstraint', 'verticalConstraint', 'itemReverseZIndex', 'strokesIncludedInLayout', 'counterAxisAlignContent']
  },
  {
    id: 'text',
    title: 'Text detail',
    why: 'Mixed-format runs, vertical alignment and fine typographic controls degrade to a single flat style over the whole string.',
    match: (p) =>
      (p.startsWith('text') || p.startsWith('font') || p.startsWith('leading')) &&
      p !== 'fontFamily' &&
      p !== 'fontSize' &&
      p !== 'fontWeight'
  },
  {
    id: 'vector',
    title: 'Vector geometry',
    why: 'No CSS equivalent exists and none should be invented. These belong in SVG, and the bridge needs an explicit SVG escape hatch rather than a lossy box.',
    match: (p) =>
      p.endsWith('Geometry') ||
      /^(vectorNetwork|arcData|starInnerRadius|pointCount|handleMirroring|booleanOperation)$/.test(p) ||
      /^stroke(Cap|Join|MiterLimit)$/.test(p)
  },
  {
    id: 'compositing',
    title: 'Masks and blending',
    why: 'Partially expressible (mix-blend-mode, mask-image) but not attempted today, so masked art silently loses its mask.',
    match: ['isMask', 'maskType', 'maskIsOutline', 'blendMode']
  }
]

function themeFor(prop) {
  for (const t of THEMES) {
    const hit = typeof t.match === 'function' ? t.match(prop) : t.match.includes(prop)
    if (hit) return t
  }
  return null
}

/** Editor bookkeeping — correctly absent from a code representation, not a gap. */
const NOT_A_GAP = new Set([
  'id', 'parentId', 'childIds', 'type', 'name', 'autoRename', 'locked', 'visible',
  'expanded', 'internalOnly', 'field', 'source', 'librarySource', 'sourceLibraryKey',
  'pluginData', 'pluginRelaunchData', 'exportSettings', 'guides', 'isPublishable',
  'isSymbolPublishable', 'publishId', 'publishedVersion', 'propertyId', 'defaultValue',
  'preferredValues', 'symbolDescription', 'symbolLinks', 'sharedSymbolVersion',
  'derivedLayout', 'derivedTextGlyphs', 'textPicture'
])

function build() {
  const all = sceneNodeProperties()
  const written = propertiesWritten()
  const readBack = propertiesRead()

  const factCarried = factCarriedProperties()

  const considered = [...all].filter((p) => !NOT_A_GAP.has(p)).sort()
  const viaCSS = considered.filter((p) => written.has(p) || readBack.has(p))
  const viaFact = considered.filter((p) => !viaCSS.includes(p) && factCarried.has(p))
  const covered = [...viaCSS, ...viaFact]
  const missing = considered.filter((p) => !covered.includes(p))

  // A property written but never read back cannot survive a round trip.
  const oneWay = considered.filter((p) => written.has(p) !== readBack.has(p))

  // Where the detector is unsure: the name occurs in a bridge file but no structured
  // read/write was recognised. Reported, never silently assumed either way.
  const bridgeSrc = [read(TO_SCENE), read(APPLY_CSS), read(FROM_SCENE)].join('\n')
  const detected = new Set([...written, ...readBack])
  const unsure = mentionedButUndetected(new Set(missing), detected, bridgeSrc)
  const unsureSet = new Set(unsure)

  const buckets = new Map(THEMES.map((t) => [t.id, []]))
  const unthemed = []
  for (const p of missing) {
    if (unsureSet.has(p)) continue
    const t = themeFor(p)
    if (t) buckets.get(t.id).push(p)
    else unthemed.push(p)
  }

  const pct = ((covered.length / considered.length) * 100).toFixed(0)
  void viaFact
  const L = []
  L.push('# Conformance gap')
  L.push('')
  L.push('> Generated by `node scripts/conformance/gap-report.mjs`. Do not hand-edit.')
  L.push('')
  L.push('Every element should carry two facts: what it **is** (scene graph) and what it')
  L.push('**means** (CSS). This is the list of facts that currently survive only one way.')
  L.push('Names here are the point — a degradation with a name is a task, a degradation')
  L.push('without one is a bug report six weeks late.')
  L.push('')
  L.push(`**${covered.length} of ${considered.length} properties bridged (${pct}%).** ${missing.length} unmapped.`)
  L.push('')
  L.push('A property is bridged if it comes home, whether via CSS or via the design-fact')
  L.push('carrier. See `.slate/ROUND-TRIP.md` for which carrier owns what, and why.')
  L.push('')
  L.push('| | count |')
  L.push('| --- | --- |')
  L.push(`| Bridged via CSS | ${viaCSS.length} |`)
  L.push(`| Carried as a design fact | ${viaFact.length} |`)
  L.push(`| Of those, one-way in CSS | ${oneWay.length} |`)
  L.push(`| One-way only (cannot round-trip) | ${oneWay.length} |`)
  L.push(`| Unmapped | ${missing.length - unsure.length} |`)
  L.push(`| Needs a human look (detector unsure) | ${unsure.length} |`)
  L.push(`| Editor bookkeeping (excluded by design) | ${all.size - considered.length} |`)
  L.push('')

  if (unsure.length) {
    L.push('## Needs a human look')
    L.push('')
    L.push('These names appear in the bridge source but no structured read or write was')
    L.push('recognised, so this script will not claim them either way. Each is either a')
    L.push('real gap or a hole in the detector — check the source and then either close')
    L.push('the gap or teach the detector.')
    L.push('')
    for (const p of unsure) L.push(`- \`${p}\``)
    L.push('')
  }

  if (oneWay.length) {
    L.push('## One-way properties')
    L.push('')
    L.push('Written in one direction but not the other, so a round trip drops them. Usually')
    L.push('cheaper to close than a fully unmapped property — half the work already exists.')
    L.push('')
    for (const p of oneWay) {
      L.push(`- \`${p}\` — ${written.has(p) ? 'HTML→scene only' : 'scene→HTML only'}`)
    }
    L.push('')
  }

  L.push('## Unmapped, by theme')
  L.push('')
  L.push('Ordered by what we intend to close first.')
  L.push('')
  for (const t of THEMES) {
    const items = buckets.get(t.id)
    if (!items.length) continue
    L.push(`### ${t.title} (${items.length})`)
    L.push('')
    L.push(t.why)
    L.push('')
    L.push(items.map((p) => `\`${p}\``).join(', '))
    L.push('')
  }

  if (unthemed.length) {
    L.push('### Unclassified')
    L.push('')
    L.push('No theme claims these yet. Either bucket them or move them to `NOT_A_GAP`.')
    L.push('')
    L.push(unthemed.map((p) => `\`${p}\``).join(', '))
    L.push('')
  }

  return { body: L.join('\n') + '\n', covered, missing, oneWay, considered }
}

const { body, covered, missing, oneWay, considered } = build()

if (process.argv.includes('--check')) {
  let current = ''
  try {
    current = read(OUT)
  } catch {
    // No report yet is a legitimate state — --check then reports it as stale, which is
    // exactly right. Anything else would be a real read failure worth seeing.
    current = ''
  }
  if (current !== body) {
    console.error('Conformance report is stale. Run: node scripts/conformance/gap-report.mjs')
    process.exit(1)
  }
  console.log('Conformance report is up to date.')
} else {
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, body)
  console.log(
    `Wrote .slate/CONFORMANCE.md — ${covered.length}/${considered.length} bridged, ` +
      `${oneWay.length} one-way, ${missing.length} unmapped.`
  )
}
