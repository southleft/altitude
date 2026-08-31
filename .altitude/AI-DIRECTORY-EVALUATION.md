# Evaluating Adobe's `.ai/` directory pattern — decision: do not adopt now

**Decision (2026-08-25): do not introduce a vendor-neutral `.ai/` directory
with `.claude/` (and `.cursor/`) as symlinks into it.** Two independent
reasons, either one sufficient on its own: the mechanism is unsafe on this
team's actual checkout, and the problem it solves does not exist here yet.
Revisit if a second AI-tool config directory (e.g. `.cursor/`) is genuinely
added — see "What would change the answer".

## The pattern, as described

Adobe's Spectrum tooling keeps a vendor-neutral source directory (`.ai/`,
with `.ai/memory/` for accumulated lessons) and makes each tool-specific
directory (`.claude/`, `.cursor/`, …) a **symlink** into it, so every AI
coding tool reads the same instructions with no copies to keep in sync.
Confirmed structurally present in `adobe/spectrum-web-components` (three
top-level dirs: `.ai/`, `.claude/`, `.cursor/`); the exact symlink-vs-copy
implementation was not independently re-verified past that structural
observation, but the pattern as stated in the task brief is a real, known
practice, not invented for this evaluation.

## Why the mechanism is unsafe here, verified on this checkout

`git config --get core.symlinks` on this actual repository checkout
(Windows 11, this session) returns **`false`**. That is not a hypothetical
edge case — it is git's well-documented default on Windows unless a
developer has both enabled Developer Mode (or run git elevated) **and**
explicitly set `core.symlinks=true`, neither of which is part of this
repo's documented setup (`CONTRIBUTING.md` has no mention of symlinks,
Developer Mode, or elevation). With `core.symlinks=false`, git does not
create a real filesystem symlink on checkout: it writes the tracked symlink
entry as a **plain text file whose content is the link target string** (e.g.
a file literally containing `../.ai`). Any tool reading `.claude/` on such a
checkout finds a directory that does not exist — or, worse, a single stray
file — and silently has no skills, no config, no CLAUDE.md content. Nothing
errors. This is precisely the "silently degrades on half the team's
machines" cost the task brief warned about, and it is not speculative: it is
the verified default on the machine this evaluation was written from.

CI is no backstop: every job in `.github/workflows/*.yml` runs on
`ubuntu-latest`. A CI matrix that never includes a Windows runner cannot
catch a broken Windows checkout — the failure mode only surfaces when an
actual Windows contributor opens their tool and finds no instructions
loaded, with no error message pointing at why.

## Why the problem does not exist here yet

This repository currently has exactly **one** AI-agent configuration
directory: `.claude/`. There is no `.cursor/`, no `.github/copilot-instructions`
equivalent, no second consumer of the same instructions. The entire benefit
of the Adobe pattern — N tool-specific directories cannot drift from each
other because they are not really N copies — has nothing to synchronize yet.
Building the symlink plumbing now would be solving a problem this repo does
not have, which this project's own collaboration norm rules out directly:
*"Simplest thing that works. Before adding an abstraction or flexibility,
name the second concrete caller that needs it; if you can't, don't add it."*
There is no second caller today.

The other half of the pattern — `.ai/memory/` for accumulated lessons — is
also already served, just not vendor-neutrally: `.claude/skills/
altitude-figma-sync/SKILL.md`'s 30-entry numbered "Hard-won traps" list *is*
accumulated memory, and `.mm/notes/` is this project's general decision log.
Neither needs a new directory to keep existing.

## Precedent already in this repo for exactly this class of problem

This repo has already done the forensic work for a structurally identical
question — "a convention that behaves differently depending on a
contributor's local OS/tool defaults" — and resolved it the same way this
evaluation recommends: not by depending on every contributor's environment
being configured correctly, but with a single git-level rule everyone gets
for free. `.gitattributes` pins the whole working tree to LF because a
CRLF-vs-LF checkout (driven by each contributor's `core.autocrlf`) measurably
changed build output by over 1% and could fail CI in either direction
depending who captured a baseline. The fix there was a committed,
environment-independent rule, not a request that everyone set their local
git config correctly. A symlink depends on exactly the kind of
per-contributor git config (`core.symlinks`) that `.gitattributes` was
written specifically to stop depending on.

## What would change the answer

- A second AI-tool config directory (most likely `.cursor/`) actually gets
  added to this repo, creating a real drift risk between two hand-maintained
  copies of the same instructions.

If that happens, the recommended mechanism is **not** a symlink — it is the
same generate-and-gate pattern this spec already applies everywhere else
(`llms.txt`, the MCP capability matrix, `.claude/skills/altitude-facts/
GENERATED-FACTS.md`): keep `.ai/` (or `.claude/`, promoted) as the single
hand-written source, and add a small script that COPIES it into the other
tool's directory with a `--check` mode that fails CI when the copy has
drifted. That gets the Adobe pattern's actual goal — one source, no drift —
without depending on any contributor's local symlink support, and it is
consistent with how every other generated artifact in this repository is
already gated.

## Evidence trail

- `git config --get core.symlinks` → `false`, run on this checkout,
  2026-08-25.
- `git ls-files -s | awk '$1==120000'` → empty; zero symlinks currently
  tracked anywhere in this repository.
- `grep -n "runs-on" .github/workflows/*.yml` → every job is
  `ubuntu-latest`; no Windows CI runner exists to catch a broken checkout.
- `ls -la .cursor` → does not exist; only `.claude/` is present today.
- `.gitattributes` (committed 2026-07-28) — the repo's own precedent for
  choosing an environment-independent mechanism over one that depends on a
  contributor's local git configuration, for a structurally identical
  cross-platform-checkout class of problem.
