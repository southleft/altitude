# Review Agent Output Contract

Version: 1.0

## Overview

This schema defines the structured output format for all review agents in the Monday Morning system. Review agents produce findings that are classified by confidence level and optionally include fix suggestions.

## Output Format

Each review agent emits an array of `ReviewFinding` objects:

### ReviewFinding

| Field             | Type    | Required | Default | Description                                                                                          |
| ----------------- | ------- | -------- | ------- | ---------------------------------------------------------------------------------------------------- |
| `id`              | string  | yes      | —       | Unique identifier for the finding (e.g., `missing-import-1`)                                         |
| `agent`           | string  | yes      | —       | Name of the review agent that produced this finding                                                  |
| `category`        | string  | yes      | —       | Category: `requirements`, `build-tests`, `conventions`, `security`, `performance`, `minimalism`      |
| `subcategory`     | string  | no       | —       | Minimalism findings only: the code-discipline code (`yagni`, `stdlib`, `native`, `shrink`, `delete`) |
| `severity`        | string  | yes      | —       | Severity: `error`, `warning`, `info`                                                                 |
| `confidence`      | string  | yes      | `low`   | Confidence tier: `high`, `medium`, `low`                                                             |
| `title`           | string  | yes      | —       | One-line summary of the issue                                                                        |
| `description`     | string  | yes      | —       | Detailed explanation of what's wrong and why                                                         |
| `file`            | string  | no       | —       | File path relative to project root                                                                   |
| `line`            | number  | no       | —       | Line number in the file                                                                              |
| `fixable`         | boolean | yes      | `false` | Whether this finding has a proposed fix                                                              |
| `fix_description` | string  | no       | —       | Human-readable description of the proposed fix                                                       |
| `diff_suggestion` | string  | no       | —       | Proposed change in unified diff format                                                               |

### Confidence Tiers

#### High Confidence (auto-fix eligible)

Issues where the correct fix is unambiguous and mechanical:

- Missing imports for symbols used in the file
- Unused variables or imports
- Obvious type errors with clear fixes
- Formatting violations (indentation, trailing whitespace, semicolons)
- Missing null checks on values already guarded elsewhere in the same file
- Dead code after return/break/continue statements

#### Medium Confidence (suggest)

Issues where a fix is likely correct but the approach may vary:

- Potential logic errors (e.g., off-by-one, wrong comparison operator)
- Suboptimal patterns with a clear better alternative
- Missing error handling where the correct strategy is ambiguous
- Deprecated API usage with multiple replacement options

#### Low Confidence (report only)

Issues requiring human judgment or broader context:

- Architectural concerns
- Design pattern questions
- Performance issues that may require profiling to validate
- Style preferences that aren't covered by project conventions
- Naming suggestions

### Backward Compatibility

Agents that do not include the new fields are treated as advisory-only:

- Missing `confidence` defaults to `low`
- Missing `fixable` defaults to `false`
- Missing `fix_description` and `diff_suggestion` are omitted
- Missing `subcategory` is omitted (only `minimalism` findings populate it)
- All existing review output remains valid without modification

### Example Output

```json
{
  "findings": [
    {
      "id": "missing-import-1",
      "agent": "conventions-reviewer",
      "category": "conventions",
      "severity": "error",
      "confidence": "high",
      "title": "Missing import for `invoke`",
      "description": "The function `invoke` is used on line 45 but not imported from '@tauri-apps/api/core'.",
      "file": "src/components/NewFeature.svelte",
      "line": 45,
      "fixable": true,
      "fix_description": "Add `import { invoke } from '@tauri-apps/api/core'` to the import block",
      "diff_suggestion": "--- a/src/components/NewFeature.svelte\n+++ b/src/components/NewFeature.svelte\n@@ -1,3 +1,4 @@\n <script lang=\"ts\">\n+  import { invoke } from '@tauri-apps/api/core';\n   import { settingsStore } from '../lib/state/settings.svelte';\n"
    },
    {
      "id": "perf-concern-1",
      "agent": "performance-reviewer",
      "category": "performance",
      "severity": "info",
      "confidence": "low",
      "title": "Potential N+1 query pattern",
      "description": "The loop on line 120 calls loadEntity() for each item. Consider batching.",
      "file": "src/lib/loadProjectEntities.ts",
      "line": 120,
      "fixable": false,
      "fix_description": "",
      "diff_suggestion": ""
    }
  ]
}
```

## Agent Implementation Guide

When updating an existing review agent to support this contract:

1. Add `confidence`, `fixable`, `fix_description`, and `diff_suggestion` fields to each finding
2. Classify each finding using the confidence tier guidelines above
3. For fixable issues, provide a `diff_suggestion` in unified diff format
4. Agents that cannot produce fixes should set `fixable: false` and omit `diff_suggestion`
5. The contract is additive — existing fields retain their meaning
