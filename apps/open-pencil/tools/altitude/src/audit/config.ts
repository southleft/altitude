import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import * as v from 'valibot'

import { ALTITUDE_RULES, type AuditFinding, type AuditSeverity } from './lint'

/**
 * `.openpencil-lint.json` at the root of a documents repository.
 *
 * ```json
 * {
 *   "failOn": "error",
 *   "rules": { "altitude/off-palette-color": "off", "altitude/foreign-component": "error" },
 *   "allow": [
 *     { "rule": "altitude/unknown-font", "value": "JetBrains Mono", "reason": "code samples" },
 *     { "rule": "*", "document": "playground" },
 *     { "rule": "altitude/hardcoded-color", "document": "marketing", "node": "12:34" },
 *     { "rule": "altitude/detached-component", "path": "Explorations / " }
 *   ]
 * }
 * ```
 *
 * `rules` changes a rule's severity or turns it off. An `allow` entry suppresses findings
 * that match every field it names: `rule` (or `*`), `document` (folder slug), `page` (name),
 * `node` (id), `value` (exact), and `path` (prefix of the layer path joined with ` / `).
 */

export const LINT_CONFIG_FILE = '.openpencil-lint.json'

const RuleSeveritySchema = v.picklist(['off', 'info', 'warning', 'error'])
const FailOnSchema = v.picklist(['error', 'warning', 'info', 'never'])

const AllowSchema = v.strictObject({
  rule: v.string(),
  document: v.optional(v.string()),
  page: v.optional(v.string()),
  node: v.optional(v.string()),
  value: v.optional(v.string()),
  path: v.optional(v.string()),
  reason: v.optional(v.string())
})

const LintConfigSchema = v.strictObject({
  $schema: v.optional(v.string()),
  failOn: v.optional(FailOnSchema, 'error'),
  rules: v.optional(
    v.pipe(
      v.record(v.string(), RuleSeveritySchema),
      v.check(
        (rules) => Object.keys(rules).every((rule) => rule in ALTITUDE_RULES),
        `Unknown rule; known rules: ${Object.keys(ALTITUDE_RULES).join(', ')}`
      )
    ),
    {}
  ),
  allow: v.optional(v.array(AllowSchema), [])
})

export type LintConfig = v.InferOutput<typeof LintConfigSchema>
export type FailOn = v.InferOutput<typeof FailOnSchema>

export const DEFAULT_LINT_CONFIG: LintConfig = { failOn: 'error', rules: {}, allow: [] }

export function parseLintConfig(value: unknown): LintConfig {
  return v.parse(LintConfigSchema, value)
}

/** The repository's lint config, or the defaults when it has none. */
export async function readLintConfig(repoRoot: string): Promise<LintConfig> {
  const path = join(repoRoot, LINT_CONFIG_FILE)
  if (!existsSync(path)) return DEFAULT_LINT_CONFIG
  try {
    return parseLintConfig(JSON.parse(await readFile(path, 'utf8')))
  } catch (error) {
    const detail = v.isValiError(error) ? v.summarize(error.issues) : String(error)
    throw new Error(`${LINT_CONFIG_FILE}: ${detail}`)
  }
}

export interface ConfiguredFinding extends AuditFinding {
  document: string
}

export interface ConfiguredFindings {
  findings: ConfiguredFinding[]
  /** Findings an `allow` entry suppressed. */
  allowed: number
}

function matches(entry: LintConfig['allow'][number], finding: ConfiguredFinding): boolean {
  if (entry.rule !== '*' && entry.rule !== finding.ruleId) return false
  if (entry.document !== undefined && entry.document !== finding.document) return false
  if (entry.page !== undefined && entry.page !== finding.page) return false
  if (entry.node !== undefined && entry.node !== finding.nodeId) return false
  if (entry.value !== undefined && entry.value !== finding.value) return false
  if (entry.path !== undefined && !finding.nodePath.join(' / ').startsWith(entry.path)) return false
  return true
}

/** Apply severities and the allowlist. */
export function applyLintConfig(
  findings: readonly ConfiguredFinding[],
  config: LintConfig
): ConfiguredFindings {
  const kept: ConfiguredFinding[] = []
  let allowed = 0
  for (const finding of findings) {
    const severity = config.rules[finding.ruleId] ?? finding.severity
    if (severity === 'off') continue
    const configured = { ...finding, severity }
    if (config.allow.some((entry) => matches(entry, configured))) {
      allowed++
      continue
    }
    kept.push(configured)
  }
  return { findings: kept, allowed }
}

const RANK: Record<AuditSeverity, number> = { error: 3, warning: 2, info: 1 }

/** True when a finding is at or above the `failOn` severity. */
export function failsOn(severity: AuditSeverity, failOn: FailOn): boolean {
  return failOn !== 'never' && RANK[severity] >= RANK[failOn]
}
