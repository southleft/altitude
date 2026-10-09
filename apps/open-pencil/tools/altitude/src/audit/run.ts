import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join, relative, resolve, sep } from 'node:path'

import {
  MANIFEST_PATH,
  diffDocuments,
  readDocumentJSON,
  type DocumentDiff,
  type DocumentJSONManifest
} from '@open-pencil/core/io/formats/document-json'
import { computeAllLayouts } from '@open-pencil/core/layout'
import type { SceneGraph } from '@open-pencil/scene-graph'

import {
  DEFAULT_LINT_CONFIG,
  applyLintConfig,
  failsOn,
  type ConfiguredFinding,
  type LintConfig
} from './config'
import { loadAltitudeFacts, type AltitudeFacts } from './facts'
import { lintAltitudeDocument } from './lint'
import { loadScoreComponent, parityChange, type DocumentParity } from './parity'
import { renderChanges, type RenderPair } from './render'

/**
 * The design audit for one change: every document folder that differs between a base and
 * a head checkout gets a structural diff, Altitude lint of the head, code ↔ canvas parity
 * against the target Altitude checkout, and before/after renders. The result is written to
 * `<out>/report.json` and rendered as the pull-request comment by `report.ts`.
 */

export const DOCUMENTS_DIRECTORY = 'documents'
export const REPORT_FILE = 'report.json'

export type AuditConclusion = 'success' | 'neutral' | 'failure'

export interface AuditFindingRow extends ConfiguredFinding {
  /** Absent on the base side: introduced or moved onto a changed layer by this change. */
  new: boolean
  /** Link to the layer's record in the head commit, when a repository URL was given. */
  url: string | null
}

export interface DocumentAudit {
  slug: string
  name: string
  status: 'added' | 'removed' | 'changed'
  diff: DocumentDiff
  findings: AuditFindingRow[]
  allowed: number
  parity: DocumentParity | null
  renders: RenderPair[]
}

export interface AuditReport {
  version: 1
  altitude: { root: string; ref: string | null }
  failOn: LintConfig['failOn']
  documents: DocumentAudit[]
  totals: {
    documents: number
    errors: number
    warnings: number
    infos: number
    newErrors: number
    newWarnings: number
    parityIntroduced: number
  }
  conclusion: AuditConclusion
  /** One-line reason for the conclusion, used as the check-run summary. */
  headline: string
}

export interface AuditOptions {
  base: string | null
  head: string
  altitudeRoot: string
  outDir: string
  config?: LintConfig
  altitudeRef?: string | null
  /** `https://github.com/<owner>/<repo>` of the documents repository, for layer links. */
  repoURL?: string | null
  headSha?: string | null
  render?: boolean
  facts?: AltitudeFacts
}

interface DocumentSide {
  dir: string
  graph: SceneGraph
  manifest: DocumentJSONManifest
}

/** `<root>` itself when it is a document folder, else `<root>/documents/<slug>`. */
export async function discoverDocuments(root: string | null): Promise<Map<string, string>> {
  const found = new Map<string, string>()
  if (!root || !existsSync(root)) return found
  if (existsSync(join(root, MANIFEST_PATH))) {
    found.set(basename(resolve(root)), resolve(root))
    return found
  }
  const dir = join(root, DOCUMENTS_DIRECTORY)
  if (!existsSync(dir)) return found
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && existsSync(join(dir, entry.name, MANIFEST_PATH)))
      found.set(entry.name, join(dir, entry.name))
  }
  return found
}

/** Locale-independent order, so every machine hashes files in the same order. */
function compareCodeUnits(first: string, second: string): number {
  if (first === second) return 0
  return first < second ? -1 : 1
}

async function folderDigest(dir: string): Promise<string> {
  const hash = createHash('sha256')
  const walk = async (current: string): Promise<void> => {
    const entries = (await readdir(current, { withFileTypes: true })).sort((a, b) =>
      compareCodeUnits(a.name, b.name)
    )
    for (const entry of entries) {
      const path = join(current, entry.name)
      if (entry.isDirectory()) await walk(path)
      else {
        hash.update(relative(dir, path).split(sep).join('/'))
        hash.update(await readFile(path))
      }
    }
  }
  await walk(dir)
  return hash.digest('hex')
}

async function readSide(dir: string | undefined): Promise<DocumentSide | null> {
  if (!dir) return null
  const { graph, manifest } = await readDocumentJSON({
    read: async (path) => new Uint8Array(await readFile(join(dir, ...path.split('/'))))
  })
  computeAllLayouts(graph)
  return { dir, graph, manifest }
}

const findingKey = (finding: ConfiguredFinding) =>
  `${finding.ruleId}\u0000${finding.nodeId}\u0000${finding.value ?? ''}`

/** Line of each node record (`"id": "<id>"`) in the head's page files. */
async function nodeLines(side: DocumentSide): Promise<Map<string, { path: string; line: number }>> {
  const lines = new Map<string, { path: string; line: number }>()
  for (const page of side.manifest.pages) {
    const text = await readFile(join(side.dir, ...page.path.split('/')), 'utf8')
    text.split('\n').forEach((line, index) => {
      const match = /^\s*"id": "(.+)",?$/.exec(line)
      if (match && !lines.has(match[1])) lines.set(match[1], { path: page.path, line: index + 1 })
    })
  }
  return lines
}

function lintSide(
  side: DocumentSide | null,
  slug: string,
  facts: AltitudeFacts,
  config: LintConfig
) {
  if (!side) return { findings: [] as ConfiguredFinding[], allowed: 0 }
  const raw = lintAltitudeDocument(side.graph, facts).map((finding) => ({
    ...finding,
    document: slug
  }))
  return applyLintConfig(raw, config)
}

const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 }

/** Head findings marked new or inherited and linked to their record, new and severe first. */
async function linkedFindings(
  base: DocumentSide | null,
  head: DocumentSide | null,
  slug: string,
  context: { options: AuditOptions; facts: AltitudeFacts; config: LintConfig }
): Promise<{ findings: AuditFindingRow[]; allowed: number }> {
  const { options, facts, config } = context
  const before = new Set(lintSide(base, slug, facts, config).findings.map(findingKey))
  const after = lintSide(head, slug, facts, config)
  const lines = head ? await nodeLines(head) : new Map<string, { path: string; line: number }>()
  const repoURL = options.repoURL?.replace(/\/+$/, '')
  const documentPath = head ? relative(resolve(options.head), head.dir).split(sep).join('/') : ''
  const link = (nodeId: string): string | null => {
    const location = lines.get(nodeId)
    if (!repoURL || !options.headSha || !location) return null
    const file = [documentPath, location.path].filter(Boolean).join('/')
    return `${repoURL}/blob/${options.headSha}/${file}#L${location.line}`
  }
  const findings = after.findings.map((finding) => ({
    ...finding,
    new: !before.has(findingKey(finding)),
    url: link(finding.nodeId)
  }))
  findings.sort(
    (a, b) =>
      Number(b.new) - Number(a.new) || SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  )
  return { findings, allowed: after.allowed }
}

function documentStatus(base: DocumentSide | null, head: DocumentSide | null) {
  if (!base) return 'added'
  return head ? 'changed' : 'removed'
}

async function auditDocument(
  slug: string,
  baseDir: string | undefined,
  headDir: string | undefined,
  options: AuditOptions,
  facts: AltitudeFacts,
  config: LintConfig,
  score: Awaited<ReturnType<typeof loadScoreComponent>> | null
): Promise<DocumentAudit> {
  const [base, head] = await Promise.all([readSide(baseDir), readSide(headDir)])
  const baseGraph = base?.graph ?? null
  const headGraph = head?.graph ?? null
  const diff = diffDocuments(baseGraph, headGraph)
  const { findings, allowed } = await linkedFindings(base, head, slug, { options, facts, config })
  return {
    slug,
    name: head?.manifest.name ?? base?.manifest.name ?? slug,
    status: documentStatus(base, head),
    diff,
    findings,
    allowed,
    parity: score ? parityChange(baseGraph, headGraph, facts, score) : null,
    renders:
      options.render === false
        ? []
        : await renderChanges(baseGraph, headGraph, diff, slug, options.outDir)
  }
}

function conclude(documents: DocumentAudit[], failOn: LintConfig['failOn']) {
  const all = documents.flatMap((document) => document.findings)
  const count = (rows: AuditFindingRow[], severity: string) =>
    rows.filter((row) => row.severity === severity).length
  const fresh = all.filter((row) => row.new)
  const parityIntroduced = documents.reduce(
    (total, document) =>
      total +
      (document.parity?.components.reduce((sum, row) => sum + row.introduced.length, 0) ?? 0),
    0
  )
  const totals = {
    documents: documents.length,
    errors: count(all, 'error'),
    warnings: count(all, 'warning'),
    infos: count(all, 'info'),
    newErrors: count(fresh, 'error'),
    newWarnings: count(fresh, 'warning'),
    parityIntroduced
  }
  const failing = fresh.filter((row) => failsOn(row.severity, failOn))
  let conclusion: AuditConclusion = 'success'
  let headline = `${documents.length} document(s) audited, no new findings`
  if (failing.length > 0) {
    conclusion = 'failure'
    headline = `${failing.length} new finding(s) at or above "${failOn}"`
  } else if (fresh.some((row) => row.severity !== 'info') || parityIntroduced > 0) {
    conclusion = 'neutral'
    headline = `${totals.newErrors} new error(s), ${totals.newWarnings} new warning(s), ${parityIntroduced} new parity disagreement(s)`
  }
  return { totals, conclusion, headline }
}

export async function runDesignAudit(options: AuditOptions): Promise<AuditReport> {
  const facts = options.facts ?? (await loadAltitudeFacts(options.altitudeRoot))
  const config = options.config ?? DEFAULT_LINT_CONFIG
  const score = await loadScoreComponent(options.altitudeRoot).catch(() => null)
  const [baseDocs, headDocs] = await Promise.all([
    discoverDocuments(options.base),
    discoverDocuments(options.head)
  ])
  await mkdir(options.outDir, { recursive: true })
  const slugs = [...new Set([...headDocs.keys(), ...baseDocs.keys()])].sort()
  const documents: DocumentAudit[] = []
  for (const slug of slugs) {
    const baseDir = baseDocs.get(slug)
    const headDir = headDocs.get(slug)
    if (baseDir && headDir && (await folderDigest(baseDir)) === (await folderDigest(headDir)))
      continue
    documents.push(await auditDocument(slug, baseDir, headDir, options, facts, config, score))
  }
  const report: AuditReport = {
    version: 1,
    altitude: { root: facts.root, ref: options.altitudeRef ?? null },
    failOn: config.failOn,
    documents,
    ...conclude(documents, config.failOn)
  }
  if (!score) {
    report.headline +=
      ' (parity skipped: the Altitude checkout has no scripts/lib/canvas-parity.mjs)'
  }
  await writeFile(join(options.outDir, REPORT_FILE), `${JSON.stringify(report, null, 2)}\n`)
  return report
}
