# OpenPencil × Altitude roadmap (ticket source)

**Goal:** OpenPencil becomes Altitude's design canvas and the Figma contract system retires.
Code stays the source of truth. Design changes arrive as PRs that are audited automatically
and can be converted to code; code changes flow back to the canvas.

This file is the source for the Lasso board `altitude-open-pencil` until the Lasso connector
can create tickets. Status: ☐ open · ◐ in progress · ☑ done.

## Epic A — Saving and version control (P0)

- ◐ **A1 Autosave to a per-document draft branch.** GitHub-bound documents commit to
  `design/<doc>/<login>` on idle (≤ 1 commit/min, only when changed). Local recovery covers
  anything not yet committed.
- ◐ **A2 Auto-open a draft PR for new documents.** The first commit of a new document opens a
  draft PR; **Ready for review** flips it out of draft.
- ◐ **A3 Saving indicator.** Unsaved → Saving… → Committed 2m ago / Offline, saved locally,
  with an error state and retry.
- ◐ **A4 Serialize in a Web Worker.** No UI freeze when committing large documents.
- ☐ **A5 Split oversized pages.** Pages above 50 MB stored as multiple files.

## Epic B — Design-change auditing in PRs (P0)

- ◐ **B6 Audit workflow in `altitude-designs`.** Runs on ready (non-draft) PRs only, skips
  autosave pushes, posts one summary comment that is updated in place.
  _Workflow on `southleft/altitude-designs` branch `ci/design-audit` (PR open); it checks out
  the tooling from Altitude `main`, so it goes live when `feat/design-pr-audit` merges.
  Command: `open-pencil altitude audit`; see ALTITUDE.md "Design PR audit"._
- ☑ **B7 Before/after renders** of changed pages and components, attached to the PR.
  _Headless CanvasKit, union-bounds alignment, pixel diff; committed to the `audit-assets`
  branch and the run artifact._
- ☑ **B8 Design-system lint.** Hard-coded values that should be tokens, detached instances,
  layers that aren't Altitude components, unknown fonts; findings link to the layer.
  _`altitude/*` rules, `.openpencil-lint.json` allowlist, links to the layer's line in the
  head commit._
- ☑ **B9 Code↔canvas parity in the PR.** `canvas:parity` / `diffContracts()` against the Altitude
  version the document targets. _Target ref in the documents repo's `altitude.json`;
  introduced vs inherited disagreements._

## Epic C — Design → code (P1)

- ☐ **C10 Generate code from a design PR.** Changed frames → `<al-*>` / `<AL*>` markup plus
  tokens; opens a draft PR in `southleft/altitude` that links back.
- ☐ **C11 Agent workflow over MCP.** Documented Claude Code flow: read the design PR, edit
  Altitude code, validate with `altitude-validate`.

## Epic D — Code → design (P1)

- ☐ **D12 Rebuild the library on every Altitude release.** Rebuild the OpenPencil component
  library and tokens, publish to `altitude-designs`.
- ☐ **D13 Library update PRs.** PR updating documents that use the library, with before/after
  renders.

## Epic E — Retire the Figma contract system (P1)

- ☐ **E14 Make `canvas:parity` blocking;** deprecate the Figma parity manifest, figma-sync and
  Code Connect gates; update `.altitude/` docs and `gates.json`.
- ☐ **E15 One-time import** of the remaining Figma-only curation into contracts and OpenPencil.

## Epic F — Fonts (P1)

- ◐ **F16 Team font library** from `altitude-designs/fonts/`, served behind GitHub sign-in.
- ◐ **F17 Missing-font UI:** per-document font report, mapping to Altitude typography tokens,
  missing-font picker.

## Epic G — Performance (P1)

- ◐ **G18 Faster open:** compact worker→main transfer, component contents built on demand.
- ◐ **G19 Region-based redraw** to fix pan stalls at full zoom-out.
- ☐ **G20 Lazy page loading** for documents opened from GitHub.

## Epic H — Collaboration (P2)

- ☐ **H21 Relay-gated live rooms** limited to repo collaborators.
- ☐ **H22 PR preview images** in the PR description.
