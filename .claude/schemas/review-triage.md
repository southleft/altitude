# Review Triage Module

Version: 1.0

## Purpose

This module defines the confidence-based triage system for review findings. It classifies findings into three tiers that determine how they are handled: auto-fixed, suggested, or reported.

## Triage Function

Given a list of `ReviewFinding` objects (see review-output-contract.md), triage them into three groups:

### Input

An array of findings from one or more review agents, each with a `confidence` field.

### Output

Three groups:

```
{
  "auto_fix": ReviewFinding[],    // confidence: "high" AND fixable: true
  "suggestions": ReviewFinding[], // confidence: "medium" AND fixable: true
  "advisory": ReviewFinding[]     // confidence: "low" OR fixable: false
}
```

### Classification Rules

1. **auto_fix** — Finding has `confidence: "high"` AND `fixable: true` AND `diff_suggestion` is non-empty
2. **suggestions** — Finding has `confidence: "medium"` AND `fixable: true`
3. **advisory** — Everything else:
   - `confidence: "low"` (regardless of fixable)
   - `fixable: false` (regardless of confidence)
   - `confidence: "high"` but `diff_suggestion` is empty (downgraded)

### Rule-Based Heuristics

When agents don't explicitly set confidence, use these heuristics to classify:

#### Auto-classify as HIGH confidence:

| Pattern                                | Category     | Example                                          |
| -------------------------------------- | ------------ | ------------------------------------------------ |
| Missing import                         | conventions  | Symbol used but not imported                     |
| Unused import/variable                 | conventions  | Import present but never referenced              |
| Type mismatch with obvious fix         | build-tests  | Wrong type with single valid alternative         |
| Formatting violation                   | conventions  | Indentation, trailing whitespace, semicolons     |
| Missing null check (guarded elsewhere) | requirements | Value checked in other branches of same function |
| Dead code after control flow           | conventions  | Code after return/break/continue                 |

#### Auto-classify as MEDIUM confidence:

| Pattern                | Category     | Example                                    |
| ---------------------- | ------------ | ------------------------------------------ |
| Potential off-by-one   | build-tests  | Loop bound `<` vs `<=`                     |
| Missing error handling | requirements | Unhandled promise rejection, missing catch |
| Deprecated API usage   | conventions  | Using removed/deprecated function          |
| Suboptimal pattern     | conventions  | Could use built-in instead of manual loop  |

#### Auto-classify as LOW confidence:

| Pattern                      | Category     | Example                                            |
| ---------------------------- | ------------ | -------------------------------------------------- |
| Architectural concern        | requirements | Component doing too much, wrong abstraction layer  |
| Performance without evidence | performance  | "This might be slow" without profiling data        |
| Style preference             | conventions  | Naming choice, code organization within a function |
| Design pattern question      | requirements | Singleton vs factory, etc.                         |

### Dependency Ordering

When multiple auto-fix findings affect the same file, order them by:

1. **Imports first** — Add missing imports before using them
2. **Top-to-bottom** — Apply changes from earlier lines first to avoid line number shifts
3. **Deletions last** — Remove unused code after additions are applied

If two findings conflict (both modify the same line), downgrade the second to a suggestion.

### Summary Statistics

After triage, produce a summary:

```
Triage Summary:
  Auto-fix:    {count} findings (will be applied automatically)
  Suggestions: {count} findings (proposed for review)
  Advisory:    {count} findings (informational only)
  Total:       {count} findings from {agent_count} agents
```
