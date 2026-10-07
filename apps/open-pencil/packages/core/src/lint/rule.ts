import type { Rule, RuleContext, RuleMeta, LintNode } from './types'

export function defineRule(definition: {
  meta: Omit<RuleMeta, 'severity'> & { severity?: RuleMeta['severity'] }
  match?: string[]
  check: (node: LintNode, context: RuleContext) => void
}): Rule {
  return {
    meta: { severity: 'warning', ...definition.meta },
    match: definition.match,
    check: definition.check
  }
}
