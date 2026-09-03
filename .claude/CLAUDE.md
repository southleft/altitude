<!-- BEGIN MM-MANAGED -->
<!-- mm-template-rev: 7 -->
<!-- Monday Morning manages everything between these markers and rewrites it on every reinstall. Do not edit inside this block — changes here are lost on the next reinstall. Put your own working agreements BELOW the END marker, in "Our Collaboration Norms"; that region is yours and is never overwritten. -->

# Monday Morning Project

This project uses Monday Morning for specs, tasks, issues, and notes, stored in `.mm/`.
Check `.mm/` state (`.mm/tasks/tasks.md`, `.mm/issues/issues.md`, `.mm/notes/notes.md`,
`.mm/specs/`) before making recommendations.

## How to Work Here

Work as a reasoning partner, not only a code producer — attended or headless:

- **Verify before asserting.** Don't state how code/config behaves unless you've read it this session; cite `path:line`. "I haven't checked" beats a confident wrong answer.
- **Flag uncertainty explicitly** before proceeding.
- **Attended:** when intent is unclear, ask or propose first. **Unattended:** don't block — pick the most reasonable interpretation, proceed, and capture the assumption as an MM idea/note.
- **You may challenge the goal, not just the details.** Surface simpler or longer-lasting paths before building.

## How `.mm/` Is Shared

`.mm/` in `.gitignore` is **by design, not a bug** — never flag it, `git add -f` past it, or hand-edit the managed `# >>> monday-morning:mm >>>` block. Team sharing happens via the cloud lane ("Team visibility" in Settings); a legacy git-mirror toggle exists (default OFF). Gitignored ≠ hidden from teammates; a mixed tracked/ignored state is normal. Change sharing via Settings toggles only.

## Entity Formats (on demand)

Exact file formats, folder conventions, and dashboard rules for specs/tasks/issues/notes/features live in `.mm/reference/entity-format.md`. The `/mm:*` entity commands load it themselves; read it before hand-creating or hand-editing any `.mm/` entity. **Never delete `.mm/`** — it holds all project specs and documentation.

## MCP Conventions

Every `mm_*` tool call requires `project_path`: the absolute project root (the directory containing `.mm/`) — use the session working directory, or `git rev-parse --show-toplevel`. On Windows, use native paths (`D:\proj` or `D:/proj`) for tool arguments and forward slashes in bash.

<!-- END MM-MANAGED -->

## Our Collaboration Norms

_This section is yours._ Monday Morning seeds it once and never overwrites it. Add the working agreements you want every Claude session in this project to follow. Some teams start from these (delete or rewrite freely):

- **Ask, don't assume.** If intent, architecture, or requirements are unclear, ask before writing code.
- **Simplest thing that works.** Before adding an abstraction or flexibility, name the second concrete caller that needs it; if you can't, don't add it.
- **Don't touch unrelated code** — but do surface design smells you notice, as separate issues to address later.
- **Suggest better ways.** Don't hesitate to propose a better approach, especially one with longer-lasting impact than a tactical fix.

### Working agreements distilled from the 2026-08-28/29 sessions (owner-reviewed style)

- **Least input from the human is the goal.** One command should run capture → build →
  verify → image pair → gate. The human names a target and reviews outcomes; the system
  finds its own defects. Never make the owner spot what a verify pass could have caught.
- **Measured truth outranks everything** — tokens name intent, but the browser's used
  values are the ground truth for pages (clamp() beats the token's nominal size).
  Perception is not a comparator: eyeballs mislabeled chip colors that the measured
  facts got right. Numbers gate; screenshots are evidence.
- **Every fix is a generic rule or a measured fact — never a one-off patch, never a
  hand-edit on canvas.** If a fix is idempotent, apply it unconditionally
  (symptom-gated triggers rot as other rules land).
- **Silence is the only forbidden failure.** Anything inexpressible degrades to a NAMED
  miss (missingVars/degradations). Silent-skip branches and silent no-op consumers each
  cost a debugging round — instrument the walk when something vanishes cleanly.
- **Record learnings the moment they cost something** — into the skill, the spec ledger,
  and the learnings note, in the same turn. Traps re-bite (backticks in String.raw
  comments bit three times in one day; that lint exists now: run
  `node scripts/contracts/figma/check-parse.mjs` after touching generator files).
- **Verify with the loop before showing the owner**: site screenshot → contract/code
  analysis → build → Figma screenshot → compare → iterate. Applies to edits as much as
  first builds, and in both directions (code→Figma, Figma→code).
- **Figma work answers to `.altitude/FIGMA-CLEANLINESS.md`** (owner-authored, binding):
  reuse components, keep hug sizing on atoms, real names on real pages ("Hero", never
  "Site Hero"), organisms at 1440/768/350 with breakpoint variants, vectors over
  screenshots, no unnecessary absolutes.
- **Guards must be positive, not negative** — "not a known decoy" let a client file
  through; the open Figma file must BE the target. Prefer allowlist-shaped checks.
