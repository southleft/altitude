# Run QA Session

Start a rapid QA workflow to fix issues across specs or apply ad-hoc fixes. Delegates work to focused subagents with minimal context for fast, accurate fixes.

## Overview

This command opens a QA session where you report issues and they get fixed immediately. Each fix is small, focused, and committed with a QA-prefixed message. The session routes fixes to the right spec automatically.

## Usage

```
/mm:qa                  # Interactive mode — open QA session, no spec preloaded
/mm:qa spec {slug}      # Spec-specific mode — target a specific spec
/mm:qa new              # Ad-hoc mode — fix not tied to any spec
```

**Examples:**

```
/mm:qa                              # Start open QA, describe issues as you go
/mm:qa spec 2026-03-15-auth-flow    # QA the auth-flow spec specifically
/mm:qa new                          # Quick ad-hoc fix, no spec context
```

---

## Step 0: Parse Arguments and Determine Mode

Parse the command input to determine which mode to use:

1. **No arguments** (`/mm:qa`): Set `mode = interactive`. Do NOT load any spec context yet. Start the session loop immediately and defer context loading until the spec matcher routes a fix.

2. **`spec {slug}`** (`/mm:qa spec auth-flow`): Set `mode = spec-specific`. Extract `{slug}` from the argument. Proceed to Step 1 to load spec context.

3. **`new`** (`/mm:qa new`): Set `mode = ad-hoc`. Skip spec context loading entirely. Proceed directly to the session loop. Fixes in this mode are standalone and do not update any spec's `qa.md`.

If the argument does not match any of these patterns, display:

```
Unknown argument. Usage:

  /mm:qa                  — Open QA session (interactive)
  /mm:qa spec {slug}      — Target a specific spec
  /mm:qa new              — Ad-hoc fix, no spec
```

### Session Announcement

After determining the mode, initialize `fix_count = 0` and display the appropriate announcement:

**Interactive mode:**

```
QA session started (interactive mode)

Describe an issue to fix, or say "done" to end.
```

**Spec-specific mode:**

```
QA session started — targeting spec: {slug}

{spec name from spec.md title}
{N} tasks completed, {M} remaining

Describe an issue to fix, or say "done" to end.
```

**Ad-hoc mode:**

```
QA session started (ad-hoc mode)

Describe what needs fixing. No spec context will be loaded.
```

---

## Session Lifecycle

The QA session has three phases:

1. **Start** — Parse args, determine mode, load initial context (if spec-specific), announce session
2. **Loop** — User describes issue → route to spec → spawn subagent → fix → commit → log → repeat
3. **End** — User says "done" → confirm fix count → no summary needed

**Subagent visibility:** All subagent responses (fix descriptions, clarifying questions, errors) MUST be surfaced in the main chat. The user should see what the subagent did without having to check git logs or file diffs.

---

## Step 1: Load Minimal Spec Context

Context loading behavior depends on the mode. In all cases, maintain a session map of loaded specs to avoid redundant file reads:

```
loaded_specs = {
  slug: {
    spec_md: "<content of spec.md>",
    implementation_md: "<content of implementation.md>",
    qa_md: "<content of qa.md or null>",
    loaded_at: "<ISO timestamp>"
  }
}
```

### Spec-Specific Mode

Load ONLY these three files from `.mm/specs/{slug}/`:

1. **`spec.md`** (required) — Read to understand what the spec covers
2. **`implementation.md`** (required) — Read to understand current task state
3. **`qa.md`** (optional) — Read if it exists to see prior QA entries

After loading, **auto-generate a QA checklist** (see Step 1.1 below) and display it to the user as a starting point.

Do NOT load `requirements.md`, `tasks.md`, or any other files from the spec folder. Minimal context keeps the subagent fast and focused.

If the spec folder does not exist or `spec.md` is missing:

```
Spec not found: {slug}

Check available specs with: ls .mm/specs/
```

Exit.

Store the loaded content in `loaded_specs[slug]` for passing to subagents.

### Step 1.1: Auto-Generate QA Checklist

When a spec's context is loaded (in spec-specific mode on entry, or in interactive mode when first routing to a spec), generate a QA checklist from its content:

1. **Parse `spec.md`** — Extract items from `## Goals`, `## Requirements`, or any `- [ ]` checkboxes. Convert each into a testable QA item. Example: requirement "Users can reset password via email" → QA item "Reset password flow sends email and allows setting new password"

2. **Parse `implementation.md`** — Extract completed tasks (`- [x]`). For each, generate a verification item. Example: completed task "Build user auth API with JWT" → QA item "Verify login returns valid JWT and protected routes reject expired tokens"

3. **Filter out untestable items** — Skip anything that is:
   - Pure code structure ("refactor X", "follow Y pattern")
   - Meta tasks ("spec created", "requirements defined", "code reviewed")
   - Architecture decisions that can't be visually or functionally verified

4. **Output the checklist** as a numbered list to the user:

```
QA Checklist for {spec-name}:

1. [ ] {testable item 1}
2. [ ] {testable item 2}
3. [ ] {testable item 3}
...

Use this as a guide. Describe any issue you find — I'll fix it.
```

5. **Cache the checklist** in the session so it doesn't regenerate when returning to the same spec.

If the spec has no parseable requirements or tasks, skip the checklist and say: `No structured requirements found — describe issues as you encounter them.`

### Interactive Mode

Start with NO spec context loaded. When the user describes an issue:

1. Determine the relevant spec (ask the user which spec this belongs to, or use the spec matcher if available)
2. Once the spec is identified, check `loaded_specs` — if the slug is already cached, reuse it
3. If not cached, load that spec's context using the same three-file rule above (`spec.md`, `implementation.md`, `qa.md` only)
4. Store in `loaded_specs[slug]` so subsequent fixes to the same spec skip file reads

### Ad-Hoc Mode

No spec context is loaded. `loaded_specs` stays empty. Proceed directly to the session loop.

---

## Step 1.5: Spec Matcher & QA Router (Interactive Mode Only)

When the user describes an issue in **interactive mode**, automatically match it to the best spec before spawning the subagent. Skip this step entirely in spec-specific mode (already targeted) and ad-hoc mode (no routing).

### Matching Algorithm

For each issue description, score all specs in `.mm/specs/` using three signals:

#### Signal 1: File Overlap (weight: 0.5)

1. Build a file-to-spec index by scanning each spec's `spec.md` and `implementation.md` for file path references (patterns like `src/components/Foo.svelte`, `src/lib/bar.ts`, etc.)
2. Extract file path mentions from the user's issue description
3. If the user references specific files or components, check which spec owns those files
4. Score = (number of matched files) / (total files referenced in the issue), normalized 0-1

If no file paths are mentioned in the issue, skip this signal and rely on the others.

#### Signal 2: Keyword Matching (weight: 0.3)

1. Tokenize the issue description into meaningful keywords (strip stop words)
2. For each spec, check for keyword matches against:
   - Spec folder name (slug)
   - The `# ` title line in `spec.md`
   - The `## Overview` section text
   - Task descriptions in `implementation.md`
3. Score = (matched keywords) / (total keywords), normalized 0-1

#### Signal 3: Recency Bias (weight: 0.2)

Prefer specs that are actively being worked on:

- `in-review` status: +1.0
- `in-progress` status: +0.7
- `backlog` status: +0.2
- `done` status: +0.0

Read status from spec frontmatter or derive from progress (same logic as `classifySpec()` in the frontend).

#### Combined Score

```
final_score = (file_overlap * 0.5) + (keyword_score * 0.3) + (recency_score * 0.2)
```

### Routing Decision

- **Confidence >= 0.6**: Auto-route to the matched spec. Inform the user: `Routing to spec: {spec-name}`
- **Confidence 0.3-0.6 OR multiple specs tied**: Ask the user to confirm:

  ```
  This looks like it could belong to:
    1. {spec-name-1} (score: {score})
    2. {spec-name-2} (score: {score})
    3. None of these (ad-hoc fix)

  Which one?
  ```

- **Confidence < 0.3 OR no matches**: Treat as ad-hoc. Inform the user: `No matching spec found — applying as ad-hoc fix.`

### Performance Rules

- Build the file-to-spec index ONCE per session, not per fix. Cache it.
- Only re-index if a new spec is loaded during the session.
- If the issue clearly names a spec or component (e.g., "the login form is broken"), match by name before running the full algorithm.

---

## Step 2: Spawn Subagent for Fix

For each QA item the user describes, construct the subagent prompt and spawn a subagent.

### Subagent Prompt Template

Use the following template to construct the prompt. Replace placeholders with actual content.

```
## QA Fix Task

You are a QA fixer for the Monday Morning project.

### Your mission
Fix the following issue quickly and accurately. Make the smallest change that resolves the issue. Do not refactor, do not add features, do not over-engineer.

### Spec context
{Only include this section if a spec is loaded — omit entirely for ad-hoc mode}
**Spec:** {slug}

**Specification:**
{content of spec.md from loaded_specs[slug].spec_md}

**Current implementation state:**
{content of implementation.md from loaded_specs[slug].implementation_md}

**Prior QA fixes:**
{content of qa.md from loaded_specs[slug].qa_md, or "None yet" if qa.md was not found}

### Issue to fix
{user's description of the issue, verbatim}

### Rules
1. Make the smallest change that fixes the issue
2. Do not modify files unrelated to the fix
3. Do not add error handling, comments, or type annotations beyond what's needed
4. If the fix is unclear, ask one clarifying question — do not guess
5. After fixing, state what file(s) you changed and what you did in 1-2 sentences

### After fixing
Commit with message: `QA: {short description}`
```

### Spawning the Subagent

Invoke the Agent tool with these parameters:

```
Agent({
  subagent_type: "implementer",
  model: "opus",
  prompt: "<the fully constructed prompt from the template above>"
})
```

**Why `model: "opus"`**: QA fixes require accuracy over speed. The subagent must understand the spec context and make precise, minimal changes. Opus provides the reasoning depth needed to avoid introducing new bugs.

**Key behavior**: The subagent should fix and move on. No lengthy analysis, no broad refactoring. Each fix is a single focused change.

---

## Step 3: Session Loop

After the subagent completes a fix, return control to the user and wait for the next QA item.

**Interactive mode loop:**

```
Fix applied. What's next?

  - Describe another issue to fix
  - "done" to end the QA session
```

**For each new item in interactive mode:**

1. Determine which spec the fix belongs to (use the spec matcher — see delegation below)
2. **Context-switch** to the target spec (see Lazy Context-Switching below)
3. Spawn a subagent for the fix (Step 2)
4. Update the spec's `qa.md` with the fix entry (delegate to log writer)
5. Return to the loop

**For spec-specific mode:** All fixes target the same spec. No routing needed.

**For ad-hoc mode:** No spec context, no `qa.md` updates. Just fix and move on.

### Lazy Context-Switching (Interactive Mode)

When the session loop routes a fix to a spec, use the following rules to manage context efficiently:

**New spec (not in cache):**

- Load `spec.md`, `implementation.md`, `qa.md` from `.mm/specs/{slug}/`
- Store in `loaded_specs[slug]` with current timestamp
- Use this context for the subagent prompt

**Returning to a previously-loaded spec:**

- The cached context may be stale if a prior fix modified files in this spec
- Re-read `implementation.md` and `qa.md` (these change during QA) but reuse cached `spec.md` (specs don't change during QA)
- Update `loaded_specs[slug].loaded_at` to current timestamp

**3+ specs touched in one session:**

- When `loaded_specs` contains 3 or more entries, display a one-time suggestion:

```
This session has touched {count} specs. Consider:
  - Finishing QA on one spec before moving to the next
  - Starting a new session scoped to a single spec: /mm:qa spec {slug}
```

- This is advisory only — do not block the user from continuing

---

## Step 4: Update QA Log

After each fix (except in ad-hoc mode), append an entry to `.mm/specs/{slug}/qa.md`.

If `qa.md` does not exist, create it with this header:

```markdown
# QA Log: {spec name}

**Spec:** {slug}
```

Append each fix entry:

```markdown
## {ISO date} — {short description of fix}

**Files changed:** {list of files}
**What was fixed:** {1-2 sentence description}
```

---

## Step 5: Commit Convention

After each fix, commit with a QA-prefixed message:

```
QA: {short description of what was fixed}
```

Examples:

```
QA: Fix sidebar not collapsing on mobile
QA: Correct typo in dashboard header
QA: Handle null check in user profile loader
```

Do NOT batch fixes into a single commit. Each fix gets its own commit.

After a successful fix commit, increment `fix_count` by 1.

---

## Step 6: End Session

When the user says "done" or signals the session is over:

- Do NOT generate a summary. The `qa.md` log and commit history are the durable record.
- Simply confirm using the tracked `fix_count`:

```
QA session complete. {fix_count} fixes applied.
```

Track `fix_count` throughout the session (increment after each successful fix commit). Initialize to 0 at session start (Step 0). The count reflects only fixes where a subagent was spawned and successfully committed a change.

---

## Delegation to Other QA Specs

This skill orchestrates but delegates specific responsibilities:

| Responsibility            | Delegated To        | What It Does                                                         |
| ------------------------- | ------------------- | -------------------------------------------------------------------- |
| Route fix to correct spec | Spec matcher        | Analyzes the described issue and determines which spec it belongs to |
| Generate QA checklist     | Checklist generator | Produces a checklist of things to verify for a spec                  |
| Write QA log entries      | Log writer          | Appends structured entries to `qa.md`                                |
| Commit formatting         | Commit convention   | Ensures `QA:` prefix and atomic commits                              |

When these downstream specs are not yet implemented, handle their responsibilities inline (route by asking the user, write log entries directly, commit with `QA:` prefix).

---

## Edge Cases

### Spec slug not found

```
Spec not found: {slug}

Available specs:
  - 2026-03-15-auth-flow
  - 2026-03-20-dashboard-redesign
  - ...

Try: /mm:qa spec {correct-slug}
```

### No changes after fix attempt

If the subagent reports no files were changed:

```
No changes were made. The issue may already be resolved or needs clarification.

Describe the issue again or say "skip" to move on.
```

Do not increment `fix_count` when no changes were made.

### Subagent asks a clarifying question

Surface the question to the user in the main chat. Do not answer on behalf of the user.

### User describes a fix that spans multiple specs

```
This fix touches multiple specs. I'll apply it as an ad-hoc fix (no spec routing).

To associate it with a specific spec, break it into separate issues per spec.
```

### Large number of fixes in one session

If more than 10 fixes in a single session, suggest:

```
You've applied {fix_count} fixes. Consider:
  - Scoping remaining issues to a follow-up session
  - Running /mm:verify-spec to check coverage
```

---

## Integration

**Related Commands:**

- `/mm:commit` — For non-QA commits
- `/mm:verify-spec` — Verify spec requirements after QA
- `/mm:complete` — Full done workflow for task completion
- `/mm:spec-status` — Check spec progress

**Triggered By:**

- Manual invocation when reviewing or testing a feature
- After a spec is marked complete, to catch edge cases
- During code review when issues are found

---

**Version:** 1.2
**Created:** 2026-03-29
**Updated:** 2026-03-29
