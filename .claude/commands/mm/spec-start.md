# Start Implementing a Spec

Implement a spec's tasks end-to-end — one spec (default), every incomplete spec sequentially (`--all`), or several specs concurrently in isolated worktrees (`--parallel`).

## Usage

```
/mm:spec-start [spec-name ...] [--auto] [--all] [--parallel] [--plan <slug>]
```

- `[spec-name ...]` — folder name(s) in `.mm/specs/`. One name → single-spec run (the default workflow below). Multiple names require `--all` (run them sequentially in the given order) or `--parallel` (run them concurrently).
- `--auto` — no per-task confirmation, stops only on error
- `--all` — batch-sequential mode: implement every incomplete spec (or the listed ones) in dependency order, one after another, in this session. See **Batch modes → `--all`**.
- `--parallel` — batch-concurrent mode: one worktree + implementer agent per spec, then merge back. See **Batch modes → `--parallel`**. (Absorbed the former `/mm:spec-start-all` and `/mm:spec-start-parallel` commands.)
- `--plan <slug>` — with `--all`/`--parallel`: filter to specs whose frontmatter `source_plan` matches the slug.

> **Isolation note.** Starting a spec from the **board** runs it in an isolated
> git worktree (`start_spec_in_worktree` → headless implementer), leaving your
> primary checkout untouched; merge it back deliberately with
> `/mm:merge-worktrees`. This chat command, by contrast, implements **in the
> current checkout** and commits per task — safe only when nothing else is
> working in this checkout. If another session is active here (another
> spec-start, or hand-editing on a feature branch), prefer the board so
> concurrent work isn't branch-switched or committed under. See spec
> `2026-06-22-spec-start-worktree-isolation`.

---

## Workflow

This command is a dialog script. The deterministic work — finding tasks, completing them, running tests — is owned by `mm_get`, `mm_complete`, and the **implementer** subagent. Prose below is what to ask the user and which tool to call next.

### 0. Ownership pre-flight

Specs can be owned by a teammate (`owner:` in spec.md frontmatter). Check before doing anything else:

1. Read the frontmatter of `.mm/specs/{spec-name}/spec.md`. **No `owner:` line → proceed silently** (legacy/unowned spec).
2. Derive your own slug from `git config user.name` (fallback `git config user.email`): lowercase, replace every run of non-alphanumeric characters with `-`, trim leading/trailing `-`. Example: `John O'Brien` → `john-o-brien`.
3. **Owner matches your slug → proceed silently.**
4. Owner differs → call `mm_fetch_claims`. If a claim for this `spec_name` lists you (`claimed_by` = current user) → proceed, noting once: `Working on {spec-name} — claimed from {owner}.`
5. Otherwise **stop and do not start the spec**:

   > This spec is owned by **{owner}**. Claim it deliberately first — `mm_claim_spec({spec_name: "{spec-name}", claimed_from: "{owner}", display_name: "<your name>", project_path})` — or tell me explicitly to start anyway.

   Only an explicit user confirmation overrides the stop. Never silently begin work on a teammate's spec — the claim is the team's handoff record.

### 0b. Team radar (collision check)

Once you're cleared to work the spec, check whether a teammate is already on it **before** dropping the sentinel or touching code:

```
mm_team_radar({project_path, spec_name: <spec-name>})
```

It reports active work-locks, recent `working_on`/`claimed` events, and open PRs / recent commits touching this spec. It is **advisory and never blocks** — if it errors, is unentitled, or returns nothing, proceed silently.

- `collisions: true` (a teammate's agent holds a lock or is mid-work on this spec) → surface the `report` once and confirm before starting:

  > {report}
  >
  > Starting in parallel risks a collision. Proceed anyway? [y/N]

  Only an explicit yes overrides. The work-lock acquired at task start is the hard guard; the radar is the early heads-up so you can sequence, pair, or claim first.
- `collisions: false` → proceed silently.

### 0c. Dependency pre-flight (build order)

Read `depends_on` from `.mm/specs/{spec-name}/spec.md` frontmatter — the specs that must be done first. For each listed slug, check whether that spec is complete (`status: done`/`complete`, or all tasks `- [x]`).

- **All prerequisites complete (or none declared)** → proceed silently.
- **One or more prerequisites incomplete** → this spec is **blocked**. Surface it once and confirm before starting:

  > **{spec-name}** depends on **{incomplete-prereq-slug(s)}**, which {isn't / aren't} done yet. Building on unfinished work risks rework. Start `/mm:spec-start {incomplete-prereq}` first, or tell me to start this one anyway. [start prerequisite / proceed anyway]

  Only an explicit "proceed anyway" overrides. This is advisory — if the spec declares no `depends_on`, there is nothing to check.

### 0d. Sibling-session check (same-checkout collision)

Team radar (0b) catches a *teammate* on the same spec. This catches a *local* sibling — another Claude session working in **this same checkout** — which is the more common way an in-place run gets clobbered (the other session auto-commits or branch-switches under you). Check before dropping the sentinel or committing anything:

```bash
# Active spec-start sentinels belonging to a DIFFERENT, still-alive process.
# "pid" here is the durable session-owner PID resolved in step 2 (the
# long-lived claude/node process, not a per-Bash-call subshell), so `kill -0`
# is a meaningful liveness check even across many tool calls.
for f in .mm/session/active/*.json; do
  [ -e "$f" ] || continue
  pid=$(sed -n 's/.*"pid":\([0-9]*\).*/\1/p' "$f")
  [ -n "$pid" ] && [ "$pid" != "$$" ] && kill -0 "$pid" 2>/dev/null && echo "SIBLING: $f (pid $pid)"
done
```

- **A live sibling sentinel exists** (or the harness already warned of a checkout collision) → surface it once and prefer isolation before committing in-place:

  > Another session is active in this checkout ({what}). This chat command commits per-task on the current branch and can be clobbered by — or clobber — the other session. Prefer the **board** path (`start_spec_in_worktree`) or a dedicated `git worktree` for this run. Proceed in-place anyway? [worktree / proceed]

  Only an explicit "proceed" overrides. This is advisory and never blocks — if `.mm/session/active/` is empty or unreadable, proceed silently. See the isolation note at the top of this command.

  **Worktree bootstrap (when the user picks worktree).** Create it under the repo convention, based on a fresh `main` HEAD:

  ```bash
  git fetch origin main
  git worktree add .claude/worktrees/{branch-slug} -b feat/{branch-slug} origin/main
  ```

  - Placement is **`.claude/worktrees/`** — that's where `/mm:merge-worktrees` scans, so merge-back is frictionless. Never create worktrees outside the repo.
  - Seed gitignored deps by **symlinking** `node_modules` from the main checkout (repo root and `desktop/monday-morning`) instead of a slow `npm install` — safe for read-only consumers (`svelte-check`, `prettier`, `vite`). **Exception:** if the run builds the MCP server (`mcp-servers/monday-morning`), it compiles in place — that package needs a real `npm install`, never a symlink.
  - Run `npx svelte-kit sync` in `desktop/monday-morning` (fresh worktrees lack `.svelte-kit/tsconfig.json`; svelte-check errors without it), then baseline `svelte-check` and confirm it matches main before implementing.
  - Commit normally — do **not** disable git hooks. The post-commit auto-bump only fires on `main` (`.githooks/post-commit` exits on any other branch), so feature-branch commits in a worktree are never version-bumped.

### 1. Locate the spec and ensure tasks exist

`project_path` is always the absolute path to the project root (the directory containing `.mm/`). Use the current working directory. Cache this value for all tool calls in this session.

**Spec availability (worktree-safe).** Confirm `.mm/specs/{spec-name}/spec.md` actually exists at `project_path` before reading it. In the cloud era `.mm/` is gitignored and **local-only**, so a fresh git worktree does NOT carry it — a relative read would silently find nothing and you'd "start" a spec that isn't there. If the spec is absent at the cwd:

- Resolve the **main checkout**, whose `.mm/` is the canonical on-disk copy:
  `MAIN=$(cd "$(dirname "$(git rev-parse --git-common-dir)")" && pwd)`. Then `$MAIN/.mm/specs/{spec-name}` is authoritative.
- Either run against `$MAIN` as `project_path`, **or** seed the worktree first by copying `$MAIN/.mm/specs/{spec-name}` and `$MAIN/.mm/config.json` into this worktree's `.mm/` (then `mm_complete` updates the worktree copy — sync it back to `$MAIN` when done so the dashboard reflects progress).
- If neither resolves the spec, **stop**: `Spec {spec-name} not found under {project_path}/.mm/specs/ — this looks like a worktree whose .mm is local-only. Run from the project root, or copy the spec in first.` Never proceed on an empty relative read.

`mm_get({entity: "spec", project_path, spec_folder: <spec-name>})` returns the spec body, parsed `## Tasks`, and progress.

**Surface intent.** Read `source:` from the spec frontmatter. If present, echo once at run start: `Intent: {source}` — and carry it into every implementer subagent prompt in step 3.2, so subagents see the upstream intent, not just the task text. If absent, say nothing here (the step-7 retro records the absence as `source: (none recorded)`).

**Task-state sanity (dedup).** A task whose ID/title is `[x]` in ANY section counts as complete — never re-implement it because an unchecked duplicate also appears elsewhere. Before implementing, scan for duplicate task entries (same `T#:` ID prefix or same normalized title) across Completed/In Progress/Blocked/Backlog, and for checkbox-less fragment lines under the task sub-sections. If found, repair the file: keep the completed copy, drop the unchecked duplicates and any fragment lines, then report one line: `Repaired N duplicate task entries in {file}`. Re-read via `mm_get` after repairing.

**Plan check.** If `.mm/specs/{spec-name}/plan.md` exists, read it in full — every task-keyed section plus `## Amendments` (format: `.claude/schemas/plan-format.md`). This is the file/symbol-level change map generated alongside the task list; it becomes the allowed-paths contract for step 3, the freshness check below, and the batching/confirm steps that follow. **If `plan.md` doesn't exist, skip this and every other "when a plan exists" block below — behavior is unchanged from today.**

**Freshness check (only when a plan exists).** Read `planning_head` from plan.md's frontmatter and compare it to `git rev-parse HEAD`. Equal → the plan is fresh, proceed. Different → compute `git diff --name-only {planning_head}..HEAD` and intersect it with the plan's full file set (the union of every task section's ADD/MODIFY/DELETE paths). Empty intersection → still fresh (the commits since planning didn't touch planned files) — proceed. Non-empty intersection → surface it:

- Interactive: `Plan may be stale for {task-ids} ({files touched since planning}). Replan just these tasks, or proceed with the existing plan?` — "replan" re-invokes the **tasks-list-creator** subagent scoped to only the affected tasks (regenerating just their plan.md sections); otherwise proceed with the plan as-is.
- `--auto`/headless: skip the ask — log one line for the step-7 retro (`Plan stale for {task-ids}, auto-replanning`), re-invoke tasks-list-creator scoped to the affected tasks automatically, then proceed.
- If `planning_head` is missing or unparseable, note it (`plan.md has no usable planning_head — treating as fresh`) and proceed — this check is advisory and never blocks.

**Attended confirm checkpoint (only when a plan exists).** Interactive mode only — `--auto` skips this entirely. Display the change map once: per-task file counts and the full file list drawn from plan.md, then ask a single `Proceed with this plan? [Y/n]`. This is the deliberate human "confirm before burn" moment — one ask for the whole plan, never a re-ask per task, and never re-asked after amendments land during implementation (amendments are recorded, not re-confirmed). `--auto`/headless: skip the ask, log one line instead (`Plan confirmed automatically ({n} files across {m} tasks)`).

**If no tasks found (neither `spec.md`'s `## Tasks` section nor `implementation.md` has any `- [ ]` items — a prose-only `## Tasks` doesn't count):**

1. Read `spec.md` and `requirements.md` (if present) from `.mm/specs/{spec-name}/`.
2. Auto-generate tasks by invoking the **task-list-creator** subagent with the spec and requirements content. This creates a populated `implementation.md` with tasks in `## Backlog`.
3. Re-read via `mm_get` to confirm tasks now exist.
4. If tasks still missing after generation, exit: "Failed to generate tasks. Run `/mm:spec --stage tasks {spec-name}` manually."

### 2. Drop a sentinel (running visibility)

So Monday Morning desktop sees this run, write a sentinel JSON on entry. `$$` inside a Bash tool call is only the **ephemeral per-call subshell PID** — some harnesses spawn a fresh shell for every Bash invocation, so `$$` dies (or a `trap ... EXIT` fires) at the end of that single call, long before the spec-start run is actually done. Writing that PID would make the desktop's 60s same-host prune (`pid_alive` check) delete the sentinel mid-run, and step 0d's sibling check would under-detect a still-live session. **Never write `pid:0`** either — same-host prune treats pid 0 as dead immediately.

Instead, resolve the **durable owner PID** — the long-lived `claude`/`node` session process — by walking up the ancestor chain from `$$` via PPID, capped at ~10 hops, falling back to `$$` if nothing matches (e.g. on Windows/Git Bash, which may lack `ps -o ppid=`):

```bash
SPEC_FOLDER="${SPEC_FOLDER:-<resolved>}"

# Resolve the durable session-owner PID: walk ancestors from $$ via PPID looking
# for the first `claude` or `node` process (the long-lived session), capped at
# 10 hops. Falls back to $$ if no match (e.g. platforms without `ps -o ppid=`).
OWNER_PID="$$"
cur="$$"
for _hop in 1 2 3 4 5 6 7 8 9 10; do
  comm=$(ps -o comm= -p "$cur" 2>/dev/null | tr -d ' ')
  case "$comm" in
    *claude*|*node*) OWNER_PID="$cur"; break ;;
  esac
  ppid=$(ps -o ppid= -p "$cur" 2>/dev/null | tr -d ' ')
  [ -z "$ppid" ] && break
  [ "$ppid" = "1" ] && break
  cur="$ppid"
done

SENTINEL_DIR=".mm/session/active"; mkdir -p "$SENTINEL_DIR"
SENTINEL="$SENTINEL_DIR/${SPEC_FOLDER}.json"
cat > "$SENTINEL" <<EOF
{"pid":$OWNER_PID,"started_at":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","host":"$(hostname -s)","user":"${USER:-$(whoami)}","cmd":"/mm:spec-start ${SPEC_FOLDER}","spec_folder":"${SPEC_FOLDER}","session_kind":"spec-start"}
EOF
```

**No `trap ... EXIT` here.** A trap set inside one Bash tool call only fires when *that call's* subshell exits — which can happen well before the run finishes — so it can't own cleanup for a multi-call script. Instead, step 5 removes the sentinel explicitly right before emitting its completion card (and step 4 does the same on the `--auto` error path); the 60s prune cycle is the backstop for hard-kills that skip both.

### 3. Implement tasks in order

Default order is "In Progress" then "Backlog" as listed. **Sequencing exception — irreversible / live-infra tasks:** if some tasks make hard-to-reverse, externally-visible changes (apply a DB migration, create cloud/Storage resources, mutate a shared service) while others are local/code-only, you may reorder to do the **safe, local tasks first** and then **STOP for explicit confirmation before the irreversible ones** — even if the latter appear earlier in the list. Surface it once:

> The next task **{task}** applies an irreversible/shared-infra change ({what}). I've done the local tasks; proceed with this one? [proceed / hold]

This keeps a `--auto` or naive run from hitting a live-infra step before the safe work is in. (Strict-order behavior is unchanged when no task is infra/irreversible.)

**Batching exception — same-file tasks:** **When a plan.md exists, derive batching and parallel-safety from it directly** rather than guessing from task descriptions. Compute the pairwise file-set intersection across all task sections (a task's file set = the union of ADD/MODIFY/DELETE paths in its plan.md section). Tasks whose file sets intersect are batch candidates and are NEVER parallel-safe — batch them per the rule below. Tasks with disjoint file sets are parallel candidates. Write the full pairwise result to `.mm/specs/{spec-name}/plan-conflicts.json` (machine-readable, for future orchestrator/`spec-start --parallel` consumption — not consumed by this command itself):

```json
{
  "generated": "<ISO-8601 timestamp>",
  "pairs": [{ "a": "T1", "b": "T2", "intersects": ["path/to/file"] }],
  "parallel_safe": [["T1", "T5"], ["T3"]]
}
```

`pairs` lists only the intersecting pairs (the conflict oracle); `parallel_safe` lists maximal groups of tasks with no pairwise intersection. **No plan.md → fall back to the prose rule:** if a run of tasks all edit the same file(s) (inferred from task descriptions), you MAY delegate them to **one** implementer as a batch instead of spinning up one per task — sequential implementers re-reading and re-editing one file re-pay context and risk numbering/skeleton drift between them. The batch implementer calls `mm_complete` once per task it finishes. Keep one commit per logical task where the changes are separable; otherwise make one batch commit naming all the tasks it covers. Record the batching as a deviation in the step-7 retro either way.

For each task in "In Progress" then "Backlog" (skip "Completed" and "Blocked"):

1. Announce: `Implementing: {task title}`.
2. Delegate to the **implementer** subagent with: task title, `spec.md`, `requirements.md` (if present), `project_path`, and the spec's `source:` intent line when present. **When a plan.md exists:** also pass the task's own plan.md section verbatim (its `## {task-id}: ...` block) and the plan.md absolute path; tell the implementer the planned file set for this task IS its allowed scope, and that it must follow the amendment protocol (`.claude/agents/mm/implementer.md`) — append an `AMEND {task-id}: ...` line to plan.md's `## Amendments` section BEFORE touching any file not in its section. The implementer runs tests and calls `mm_complete({entity: "task", ..., force: true})` itself. **Do not re-complete the task.** Ask it to return the explicit list of files it created or modified for this task.

   **Plan compliance check (only when a plan.md exists):** compare the files the implementer reported against the task's planned file set, plus any files added via `AMEND {task-id}: ...` entries in `## Amendments`. Planned-but-untouched is fine — note it, nothing else to do. Touched-but-not-in-the-plan-and-not-amended is a scope violation to surface:
   - Interactive: ask `{file} was touched but isn't in {task-id}'s plan or amendment log — keep it, or revert?` and act on the answer.
   - `--auto`: revert the stray file per the existing stray-revert practice (restore it to its pre-task state) and log it in the step-7 retro.
3. Commit — **stage only this task's own files; never `git add -A`/`git commit -a`.** A shared checkout may hold other concurrent sessions' (or the user's) uncommitted work, and `git add -A` would sweep it into your commit.

   **Is `.mm/` tracked?** Check once against the spec's own file, not the `.mm` directory — a
   post-cloud-migration repo often carries LEGACY TRACKED `.mm` files alongside a `.gitignore`
   rule for `.mm/`; in that hybrid state, probing the directory reports "not ignored" (lying)
   while newly-created files under it genuinely are ignored: `git check-ignore -q
   ".mm/specs/${SPEC_FOLDER}/spec.md" && MM_TRACKED=0 || MM_TRACKED=1`.
   - `MM_TRACKED=1` (legacy / `.mm` shared via git): include the spec folder so task-state is versioned — stage `$CHANGED` **and** `.mm/specs/{spec-folder}/`. (This per-task staging is the happy path; step 6 reconciles any task whose `.mm/` state was missed so nothing dangles at the end.)
   - `MM_TRACKED=0` (`.mm` is gitignored / local-only — the default after the cloud-workspace migration): **do NOT** stage `.mm/specs/...`. It's gitignored, so the `git add` is a no-op; the spec/task state is carried by the cloud workspace, not git. Stage **only** the tracked code files in `$CHANGED`.
   - If `$CHANGED` is empty (the task touched only `.mm/` — e.g. an audit/notes task) and `.mm` is gitignored, there is **nothing to commit** — skip the commit for this task and continue.

   **Formatting gate:** files under `desktop/monday-morning/` (including `src-tauri/resources/`
   docs/templates) must pass `npx prettier --check` (run from `desktop/monday-morning/`) before
   commit — the pre-push format gate rejects unformatted files. Implementer prompts inherit this
   requirement.

   Then partial-commit exactly the staged paths:

   ```
   # CHANGED = the CODE files the implementer reported for THIS task (space-separated)
   # PATHS = "$CHANGED .mm/specs/{spec-folder}/" when MM_TRACKED=1, else just "$CHANGED"
   git add -- $PATHS || { git add -- $CHANGED; }
   git commit -m "Implement: {task title}

   Spec: {spec-name}

   Generated with Claude Code" -- $PATHS
   ```

   If `git add` refuses the `.mm/specs/...` path as ignored (the hybrid-state trap above),
   drop it from `PATHS` and retry with just `$CHANGED` — never let a `.mm` staging failure
   sink the code commit.

   > **Concurrency:** commit on the CURRENT branch — never `git checkout`/`switch`
   > to another branch while this or sibling sessions hold uncommitted work.
   > A shared checkout serializes writers through git's own `.git/index.lock`
   > (and MM's per-checkout writer lock for app-side writes). If a commit fails
   > with "Another git process seems to be running" / "index.lock", **wait
   > ~1s and retry** (up to ~5 times) rather than deleting the lock or forcing —
   > another session is mid-write and will release it. See the
   > conflict-free-concurrent-sessions spec.

4. Interactive mode (default): show `Files changed: N · Tests: passing` and ask `Continue? [Y/n]`. Auto mode (`--auto`): proceed immediately.

### 4. On error

Implementer stops on test/build failure. Interactive: show error, ask fix-and-resume or skip. Auto: remove the sentinel (`rm -f ".mm/session/active/${SPEC_FOLDER}.json"`) so the errored run doesn't leave it pinned to a live session PID, then write the step-7 retro before stopping, then stop and report:

```
Implementation stopped: {error}
Completed: {n}/{total}
Resume: /mm:spec-start {spec-name} --auto
```

### 5. Final verification

After the last task is implemented, **always** invoke `/mm:verify-spec {spec-name} --fix` — this graded gate runs once per run and is the only thing that counts as "verified." It runs **unconditionally unless the user explicitly passed `--skip-verify`** (the one deliberate opt-out; see the deferred card below). A task that merely *looks* like verification is never an opt-out.

**Worktree-isolated runs.** Trigger on the *condition*, not one code path: whenever the implementation landed in a **different checkout than the one whose `.mm/` holds the spec** — step 0d's worktree bootstrap, a board `start_spec_in_worktree` run, or any ad-hoc `git worktree` you built in — the spec's `.mm/` state lives at the main checkout (`project_path`) but the code was committed elsewhere. Detect it rather than relying on memory of how the run started: if `project_path`'s own working tree/HEAD carries **none of this spec's file changes** (e.g. `git -C {project_path} diff --stat` and the recent `git -C {project_path} log` show nothing for the files step 3 touched), the implementation is in another tree. Invoke the gate as `/mm:verify-spec {spec-name} --fix --code-path {impl-checkout-abs-path}` so it inspects and fixes that checkout's code while still reading/writing spec state at `project_path`. Never hand-roll verification because of the split; `--code-path` is documented in `verify-spec.md`.

> **Do not let a task substitute for this gate.** A task list may contain an item that *sounds* like verification ("verify end-to-end", "final QA", "run verify-spec"). Completing that task does **not** satisfy step 5 and does **not** exempt you from running `/mm:verify-spec`. "Every task is `[x]`" is the trigger to *run* this gate, never a signal that verification already happened. If `mm_complete` returned `verification_recommended: true` on the last task (and `verification_skipped` is not set), that is the explicit signal to run it now.

It runs Generate→Critique→Revise (default 1 iteration; the critique is delegated to a fresh implementation-verifier subagent so it doesn't re-pay this session's full context) and writes `.mm/specs/{spec}/verification/reflection-verification.md`. If that file does not exist after this step, the gate did not run — go back and run it. For release-critical specs, or when the user asked for extra rigor, pass `--thorough` for up to 3 revision cycles.

**Before emitting any of the three completion cards below** (passed / failed / deferred), remove the sentinel so the run stops showing as active: `rm -f ".mm/session/active/${SPEC_FOLDER}.json"`.

**Verification passed:**

```
Implementation Complete!
Spec: {spec-name} · Tasks: {n}/{n} · Commits: {count}
Verification: Passed ({pass}/{total})
Status: in-review → done (auto-promoted by passing verdict)
Report: .mm/specs/{spec}/verification/reflection-verification.md
```

(Only claim the status line if the spec actually transitioned — an already-`done` or manually-overridden spec doesn't re-promote.)

**Verification failed** (any MISS or REGRESSION after the iteration budget):

1. Call `mm_revert_spec_completion({project_path, spec_path, reason: "Verification failed: {n} MISS, {m} REGRESSION after {iterations} iteration(s)"})` to undo the feature rollup.
2. Surface the failed requirements grouped by severity and tell the user:

   ```
   To fix and re-verify:
     1. Address the gaps above
     2. Run /mm:verify-spec {spec-name} --fix — a passing verdict auto-promotes the spec in-review → done (the only automatic path into done)
   ```

**Verification skipped/deferred** (`--skip-verify`, or `mm_complete` returned `verification_skipped: true`): still emit a completion card so the run never ends silently — just flag that the gate has not run:

```
Implementation Complete (verification deferred)
Spec: {spec-name} · Tasks: {n}/{n} · Commits: {count}
Run /mm:verify-spec {spec-name} --fix to grade this spec.
```

**Every successful finish ends with one of the three cards above** (passed / failed / deferred). Never stop after the last task with no summary — a silent end reads as "nothing happened."

### 6. Reconcile task-state (MM_TRACKED=1 only)

If `.mm/` is **not** tracked (`MM_TRACKED=0`, the cloud-workspace default) skip this — task-state lives in the cloud, not git.

When `.mm/` **is** tracked, per-task commits should already have versioned the spec folder, but a missed task or the verification report can leave `.mm/specs/{spec-folder}/` dirty. Before declaring the run done, sweep it so no ticked-but-uncommitted task-state dangles (a running MM app can otherwise revert those flips):

```bash
if [ "$MM_TRACKED" = "1" ] && ! git diff --quiet -- ".mm/specs/${SPEC_FOLDER}/"; then
  git add -- ".mm/specs/${SPEC_FOLDER}/"
  git commit -m "Complete spec: ${SPEC_FOLDER} (task-state + verification)

Generated with Claude Code" -- ".mm/specs/${SPEC_FOLDER}/"
fi
```

Stage **only** the spec folder — never `git add -A` (a shared checkout may hold other sessions' work). Same `index.lock` retry rule as step 3 applies. Uses the same `MM_TRACKED` probe from step 3 (checked against the spec's own file, not the `.mm` directory — see the hybrid-state note there); if `git add` refuses the path as ignored, there's nothing to reconcile — skip silently rather than failing the run.

### 7. Run retro (observability — always)

Every run leaves evidence about itself, not just about its code. This step fires **after
emitting the completion card** (passed / failed / deferred — any of the three in step 5) **and**
on the step-4 `--auto` error stop. Every exit path, every run — this is not conditional on how
the run went.

**Where:** `.mm/reviews/spec-start-runs/{YYYY-MM-DD-HHMM}-{spec-folder}.md` (`mkdir -p
.mm/reviews/spec-start-runs`, timestamp in local/UTC is fine — just be consistent within a run).

**Content — use this template:**

````markdown
# spec-start run retro: {spec-folder}

- Spec folder: {spec-folder}
- Intent: {source: value from spec.md frontmatter, or "(none recorded)"}
- Date: {YYYY-MM-DD HH:MM}
- Mode: {--auto | interactive}
- spec-start doc version: {output of `git log -1 --format=%h -- .claude/commands/mm/spec-start.md`}
- Exit path: {passed | failed | deferred | error | user-abort}

## Gates fired

- [ ] Step 0 (ownership pre-flight): fired / skipped ({why}) / n-a
- [ ] Step 0b (team radar): fired / skipped ({why}) / n-a
- [ ] Step 0c (dependency pre-flight): fired / skipped ({why}) / n-a
- [ ] Step 0d (sibling-session check): fired / skipped ({why}) / n-a
- [ ] Step 1 (locate spec / ensure tasks exist): fired / skipped ({why}) / n-a
- [ ] Step 2 (sentinel dropped): fired / skipped ({why}) / n-a
- [ ] Step 3 (implement tasks in order): fired / skipped ({why}) / n-a
- [ ] Step 4 (error path): fired / skipped ({why}) / n-a
- [ ] Step 5 (final verification): fired / skipped ({why}) / n-a
  - Verify gate ran: yes / no
  - Card emitted: passed / failed / deferred
- [ ] Step 6 (reconcile task-state): fired / skipped ({why}) / n-a

## Deviations

{Every error, retry, workaround, or improvisation recorded VERBATIM as it happened —
exit codes, tool errors, git output, exact messages. "None" is a valid, meaningful entry
when nothing went wrong. When a plan.md existed for this run, summarize its amendments here
too: the count of `AMEND` lines added during this run, plus one line each (task-id, path,
reason).}

## Stats

```yaml
tasks_total: 0
tasks_completed: 0
implementer_invocations: 0
implementer_retries: 0
commits: 0
commit_failures: 0
verification_iterations: 0
verification_verdict: null # passed | failed | deferred | n-a
index_lock_retries: 0
wall_clock_minutes: 0 # coarse
files_changed_plus: 0
files_changed_minus: 0
rework_flag: null # filled by later audits, never by the run
```
````

**Rules:**

- **Non-blocking.** If the write fails for any reason, report one line (`Retro write failed:
  {error}`) and finish the run anyway — never fail a run over its own retro.
- **No recursion (R7).** This step writes a file and stops. It never invokes
  `/mm:audit-command`, `/mm:spec-start`, or any other command. Audits harvest these retro
  files on their own schedule — the retro's job ends at the write.
- **Record events, not judgment.** The retro captures raw facts (what fired, what broke,
  what the stats were) — it does not grade the run or assess quality. That evaluation
  happens later, at audit time, across many retros.

---

## Batch modes

Both batch modes reuse the single-spec workflow above per spec — everything here is about **selection, ordering, and isolation**, not a different implementation engine.

### `--all` — sequential batch (absorbs the former spec-start-all)

**Resolve the spec list:**

- **Explicit spec names given** → run exactly those, in the given order. Verify each `.mm/specs/{folder}/spec.md` exists; auto-generate tasks (task-list-creator, step-1 rule) for any spec without them. If the given order would start a spec before an incomplete prerequisite, warn once, then honor the explicit order (it's an intentional override).
- **`--plan <slug>`** → filter all specs to `source_plan == slug`, keep the incomplete ones; if none, say `All specs in plan '{slug}' are complete.` and stop. Order the filtered set by dependencies (below), using judgment for ties (foundational specs first).
- **Neither** → scan `.mm/specs/*/` for specs with incomplete tasks and order by: `.mm/specs/order.json` waves (if present) → topological sort of `depends_on` → creation date (oldest first).

**Respect blockers regardless of source:** never start a spec before its `depends_on` prerequisites are complete. A blocked spec whose prerequisite isn't part of this run is **deferred** and reported, not run early.

Show the resolved order (wave, spec, tasks, ready/blocked-by) and confirm once (`Start implementing in this order? [Y/n]`; `--auto` skips).

**Run each spec** through the full single-spec workflow above (steps 0–7 including the per-spec sentinel with the durable-PID rule from step 2 — the batch does NOT get one shared sentinel). Between specs: interactive mode pauses (`Spec complete: {name}. Continue to {next}? [Y/n]`); `--auto` continues until done or error. On a spec failure in `--auto`, stop and report per-spec progress (`✓ done / ✗ failed-at-task / - not started`) plus `Resume: /mm:spec-start --all --auto` — completed tasks stay `[x]`, so re-running resumes.

**Final summary:** table of specs, task counts, and commits, then total.

### `--parallel` — concurrent worktrees (absorbs the former spec-start-parallel)

> **Desktop note:** the board's "Run Parallel" controls do NOT route through this command — they call the Rust orchestrator (`start_parallel_specs`), which seeds worktrees and spawns headless implementers itself. This mode is for an **interactive Claude Code CLI**.

**Select:** explicit spec names skip the picker and ARE the selection. Otherwise scan for incomplete specs (canonical task source: spec.md `## Tasks` checkboxes, legacy implementation.md fallback; a checkbox-less `## Tasks` doesn't count), apply `--plan` filtering if given, and present an `AskUserQuestion` multi-select showing `{title} ({done}/{total} tasks)` with wave/blocked context per option. One spec selected → point at plain `/mm:spec-start {spec}` and stop. Auto-generate tasks for any selected spec that has none (skip + warn on failure).

**Wave-batch by dependencies (always):** two specs where one `depends_on` the other never share a batch. Drop blocked specs whose prerequisite isn't in this run (list what they wait on). If the selection contains a chain, run it as sequential waves — `order.json` phase numbers when present, else derived from `depends_on`. Within a wave, prefer specs with disjoint file footprints (use `plan-conflicts.json` / plan.md file sets when they exist; shared-file specs run sequentially).

**Per-spec sentinel:** before each launch, write `.mm/session/active/{spec}.json` exactly per step 2 above — including the **durable owner-PID resolution**; never `pid: $$` (the per-call subshell dies immediately and the 60s prune deletes the sentinel mid-run) and never a `trap ... EXIT`. Remove each sentinel in its own Bash call when that spec's agent completes.

**Launch:** one **Task** tool call per spec — `subagent_type: "implementer"`, `isolation: "worktree"`, `run_in_background: true` — **all in a single message** (that's what makes them parallel). Each agent's prompt embeds the spec.md / requirements.md / canonical task list / latest checkpoint contents, plus these standing instructions:

- **Seed `.mm/` first** — it's gitignored, so the worktree does NOT have it. `MAIN=$(cd "$(dirname "$(git rev-parse --git-common-dir)")" && pwd)`, then copy `$MAIN/.mm/specs/{spec}` (+ `config.json`) into the worktree's `.mm/`.
- Grounding check: verify every concrete file/component the spec names still exists (Glob/Grep); treat missing references as stale docs — adapt, note the discrepancy, never recreate a file because a stale doc names it.
- The embedded task list is canonical — don't re-derive. Implement each `- [ ]` in order; record completion in spec.md `## Tasks` (and mirror implementation.md when it exists); commit per task; on failure note the error and continue.
- Final summary MUST include `WORKTREE: {abs path}` and `BRANCH: {name}` lines, tasks completed/failed, stale references, commit count. No pushing; changes stay in the worktree.

**Manifest bridge (desktop dashboard):** after launching, write `.claude/parallel-runs.json` — `{started_at, source_branch, specs: [{spec_folder, spec_title, worktree_path, branch_name, status: "running"}]}`. Background Task results sometimes omit worktree/branch — recover from `git worktree list --porcelain` or the agents' `WORKTREE:`/`BRANCH:` lines; never guess. Update each spec's `status` to `complete`/`failed` as agents finish.

**Collect:** `TaskOutput` with `block: true` per agent, in any order.

**Salvage `.mm/` from every successful worktree (CRITICAL — the merge does not carry it):** copy `<worktree>/.mm/specs/<spec>/` over the parent's (agent's version is authoritative), `rsync -a --ignore-existing` any new notes/issues, prefer a worktree feature.json with higher completed_specs. Verify the parent's task state reflects the agent's completions before removing anything. Report what was salvaged.

**Merge back:** per successful branch, probe with `git merge --no-commit --no-ff {branch}` then `git merge --abort`; report clean/conflicted (with files). Then offer via `AskUserQuestion`: merge all clean / review each individually / leave branches (printing the manual `git merge` + cleanup commands). **Cleanup gotchas:** runtime-spawned worktrees are locked — `git worktree unlock` before `remove`; `remove --force` discards unsalvaged untracked files, so salvage first. `/mm:merge-worktrees` recovers an interrupted merge step.

**Per-spec verification still applies:** each merged spec goes through the step-5 gate (`/mm:verify-spec {spec} --fix`, with `--code-path` if grading before merge-back) — parallel execution never substitutes for the gate.

---

## Resume / Related

Tasks already `[x]` stay completed; re-run to pick up (single, `--all`, and `--parallel` alike).

- `/mm:spec` — create the spec first
- `/mm:order-specs` — compute the build-order waves batch modes consume
- `/mm:merge-worktrees` — recover an interrupted `--parallel` merge step
- `/mm:verify-spec` — standalone verification pass
