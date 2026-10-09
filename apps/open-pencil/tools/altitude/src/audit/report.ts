import type { RenderPair } from './render'
import type { AuditFindingRow, AuditReport, DocumentAudit } from './run'

/**
 * The pull-request comment for an audit report. The first line is the sticky-comment
 * marker the workflow uses to find and update its own comment.
 */

export const COMMENT_MARKER = '<!-- openpencil-design-audit -->'

export interface CommentOptions {
  /** Findings listed before the collapsible full list. */
  top?: number
  /**
   * Base URL the render paths are appended to (for example the `audit-assets` branch blob
   * URL with `?raw=true` added by the formatter). Without one, renders are referenced as
   * workflow-artifact paths.
   */
  assetsBaseURL?: string | null
  /** Link to the workflow run's artifacts, shown when renders are not inlined. */
  artifactsURL?: string | null
}

const ICON = { success: '✅', neutral: '⚠️', failure: '❌' } as const
const SEVERITY = { error: '🔴 error', warning: '🟠 warning', info: '🔵 info' } as const
/** Comments are limited to 65 536 characters; keep a margin for the marker and footer. */
const MAX_COMMENT_LENGTH = 60_000

function escapeCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

function layer(row: AuditFindingRow): string {
  const path = escapeCell(row.nodePath.join(' / ') || row.nodeName)
  const label = `${escapeCell(row.page)} › ${path}`
  return row.url ? `[${label}](${row.url})` : `${label} \`${row.nodeId}\``
}

function findingRow(row: AuditFindingRow): string {
  return `| ${SEVERITY[row.severity]}${row.new ? ' **new**' : ''} | \`${row.ruleId.replace('altitude/', '')}\` | ${layer(row)} | ${escapeCell(row.message)} | ${escapeCell(row.suggest ?? '')} |`
}

const FINDING_HEADER =
  '| Severity | Rule | Layer | Finding | Suggestion |\n| --- | --- | --- | --- | --- |'

/** Counts over the pages a designer sees; library definitions are summarised separately. */
function visibleCounts(document: DocumentAudit) {
  const pages = document.diff.pages.filter((page) => !page.internal)
  const sum = (pick: (page: (typeof pages)[number]) => number) =>
    pages.reduce((total, page) => total + pick(page), 0)
  return {
    pages: pages.length,
    added: sum((page) => page.nodes.addedCount),
    removed: sum((page) => page.nodes.removedCount),
    changed: sum((page) => page.nodes.changed.length),
    bound: sum((page) => page.tokenBindings.added.length),
    unbound: sum((page) => page.tokenBindings.removed.length),
    placed: sum((page) => page.instances.added.length),
    deleted: sum((page) => page.instances.removed.length),
    detached: sum((page) => page.instances.detached.length)
  }
}

function summaryTable(report: AuditReport): string[] {
  const lines = [
    '| Document | Pages | Layers + / − / ~ | Tokens bound / unbound | Instances + / − / detached | Lint E / W / I | Parity (new) |',
    '| --- | --- | --- | --- | --- | --- | --- |'
  ]
  for (const document of report.documents) {
    const c = visibleCounts(document)
    const count = (severity: string) =>
      document.findings.filter((row) => row.severity === severity).length
    const parity = document.parity
      ? String(document.parity.components.reduce((n, row) => n + row.introduced.length, 0))
      : 'n/a'
    const status = document.status === 'changed' ? '' : ` (${document.status})`
    lines.push(
      `| **${escapeCell(document.name)}** \`${document.slug}\`${status} | ${c.pages} | ${c.added} / ${c.removed} / ${c.changed} | ${c.bound} / ${c.unbound} | ${c.placed} / ${c.deleted} / ${c.detached} | ${count('error')} / ${count('warning')} / ${count('info')} | ${parity} |`
    )
  }
  return lines
}

function changesSection(document: DocumentAudit): string[] {
  const lines: string[] = []
  for (const page of document.diff.pages) {
    if (page.internal) continue
    const parts = [
      page.nodes.addedCount ? `${page.nodes.addedCount} added` : null,
      page.nodes.removedCount ? `${page.nodes.removedCount} removed` : null,
      page.nodes.changed.length ? `${page.nodes.changed.length} changed` : null
    ].filter(Boolean)
    lines.push(
      `- **${escapeCell(page.name)}** (${page.status}): ${parts.join(', ') || 'reordered'}`
    )
    for (const instance of page.instances.detached) {
      lines.push(`  - detached \`${instance.component}\`: ${escapeCell(instance.path.join(' / '))}`)
    }
    for (const instance of page.instances.added.slice(0, 5)) {
      lines.push(`  - placed \`${instance.component}\`: ${escapeCell(instance.path.join(' / '))}`)
    }
    if (page.instances.added.length > 5) {
      lines.push(`  - … ${page.instances.added.length - 5} more instances placed`)
    }
    for (const binding of page.tokenBindings.removed.slice(0, 5)) {
      lines.push(
        `  - unbound \`${binding.variable}\` from ${escapeCell(binding.path.join(' / '))} (${binding.field})`
      )
    }
  }
  const internal = document.diff.pages.filter((page) => page.internal)
  if (internal.length > 0) {
    const components = internal.reduce((n, page) => n + page.changedComponents.length, 0)
    const layers = internal.reduce((n, page) => n + page.nodes.changed.length, 0)
    const unbound = internal.reduce((n, page) => n + page.tokenBindings.removed.length, 0)
    lines.push(
      `- Library definitions: ${components} component(s), ${layers} layer(s) edited, ${unbound} token binding(s) removed`
    )
  }
  const { variables } = document.diff
  if (variables.added.length + variables.removed.length + variables.changed.length > 0) {
    lines.push(
      `- Variables: ${variables.added.length} added, ${variables.removed.length} removed, ${variables.changed.length} changed`
    )
  }
  return lines
}

function paritySection(report: AuditReport): string[] {
  const rows = report.documents.flatMap((document) =>
    (document.parity?.components ?? []).map((row) => ({ document, row }))
  )
  if (rows.length === 0) return []
  const lines = [
    '### Code ↔ canvas parity',
    '',
    `Each Altitude component placed in a changed document, scored with \`diffContracts()\` against Altitude ${report.altitude.ref ? `\`${report.altitude.ref}\`` : '(local checkout)'}.`,
    '',
    '| Document | Component | API | Tokens | New disagreements | Resolved |',
    '| --- | --- | --- | --- | --- | --- |'
  ]
  for (const { document, row } of rows) {
    lines.push(
      `| \`${document.slug}\` | \`<${row.tag}>\` | ${row.api.matched}/${row.api.total} | ${row.token.matched}/${row.token.total} | ${row.introduced.length} | ${row.resolved.length} |`
    )
  }
  const introduced = rows.flatMap(({ row }) => row.introduced.map((d) => ({ tag: row.tag, d })))
  if (introduced.length > 0) {
    lines.push('', '<details><summary>Disagreements introduced by this change</summary>', '')
    for (const { tag, d } of introduced) {
      lines.push(
        `- \`<${tag}>\` ${d.dimension} **${d.kind}** \`${escapeCell(d.key)}\`${d.detail ? `: ${escapeCell(d.detail)}` : ''}`
      )
    }
    lines.push('', '</details>')
  }
  const missing = [...new Set(report.documents.flatMap((d) => d.parity?.missingContracts ?? []))]
  if (missing.length > 0) {
    lines.push(
      '',
      `No code contract at the target version for: ${missing.map((t) => `\`${t}\``).join(', ')}.`
    )
  }
  return [...lines, '']
}

function image(path: string | null, alt: string, options: CommentOptions): string {
  if (!path) return '—'
  if (!options.assetsBaseURL) return `\`${path}\``
  const base = options.assetsBaseURL.replace(/\/+$/, '')
  return `<img src="${base}/${path.split('/').map(encodeURIComponent).join('/')}?raw=true" alt="${alt.replace(/"/g, '&quot;')}" width="320">`
}

function rendersSection(report: AuditReport, options: CommentOptions): string[] {
  const renders = report.documents.flatMap((document) =>
    document.renders.map((render): [DocumentAudit, RenderPair] => [document, render])
  )
  if (renders.length === 0) return []
  const lines = ['### Before / after', '']
  if (!options.assetsBaseURL) {
    lines.push(
      options.artifactsURL
        ? `Renders are in the [workflow artifacts](${options.artifactsURL}).`
        : 'Renders are written next to `report.json` (paths below).',
      ''
    )
  }
  lines.push('| | Before | After | Changed pixels |', '| --- | --- | --- | --- |')
  for (const [document, render] of renders) {
    const label = `${render.kind === 'component' ? 'Component' : 'Page'} **${escapeCell(render.label)}**<br>\`${document.slug}\``
    const diff = render.diff
      ? `${image(render.diff, `${render.label} diff`, options)}<br>${render.changedPercent}%`
      : '—'
    lines.push(
      `| ${label} | ${image(render.base, `${render.label} before`, options)} | ${image(render.head, `${render.label} after`, options)} | ${diff} |`
    )
  }
  return [...lines, '']
}

export function formatAuditComment(report: AuditReport, options: CommentOptions = {}): string {
  const top = options.top ?? 10
  const lines = [
    COMMENT_MARKER,
    `## ${ICON[report.conclusion]} Design audit`,
    '',
    `${report.headline}. Checked against Altitude ${report.altitude.ref ? `\`${report.altitude.ref}\`` : '(local checkout)'}; failing on new findings at or above \`${report.failOn}\`.`,
    ''
  ]
  if (report.documents.length === 0) {
    lines.push('No document folders changed.')
    return lines.join('\n')
  }
  lines.push(...summaryTable(report), '')
  for (const document of report.documents) {
    const changes = changesSection(document)
    if (changes.length === 0) continue
    lines.push(
      `<details><summary>Changes in <b>${escapeCell(document.name)}</b></summary>`,
      '',
      ...changes,
      '',
      '</details>',
      ''
    )
  }

  const findings = report.documents.flatMap((document) => document.findings)
  const allowed = report.documents.reduce((n, document) => n + document.allowed, 0)
  if (findings.length > 0) {
    lines.push('### Design-system lint', '')
    lines.push(FINDING_HEADER, ...findings.slice(0, top).map(findingRow), '')
    if (findings.length > top) {
      lines.push(`<details><summary>All ${findings.length} findings</summary>`, '', FINDING_HEADER)
      lines.push(...findings.map(findingRow), '', '</details>', '')
    }
  } else {
    lines.push('### Design-system lint', '', 'No findings.', '')
  }
  if (allowed > 0)
    lines.push(`_${allowed} finding(s) suppressed by \`.openpencil-lint.json\`._`, '')

  lines.push(...paritySection(report), ...rendersSection(report, options))
  lines.push(
    '<sub>Generated by `open-pencil altitude audit`. **new** = not present on the base branch; only new findings can fail the check.</sub>'
  )
  let comment = lines.join('\n')
  if (comment.length > MAX_COMMENT_LENGTH) {
    comment = `${comment.slice(0, MAX_COMMENT_LENGTH)}\n\n…truncated; the full report is in the workflow artifacts.`
  }
  return comment
}
