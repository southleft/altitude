# Rank Next

Read the given candidate specs' task lists and judge two things about each: how much of it is
actually doable in an unattended headless session, and whether it has momentum. Writes
`.mm/product/next.json`, which the Roadmap's **NEXT** section reads.

## Usage

```
/mm:rank-next <spec-slug> [<spec-slug> ...]
```

The caller supplies the candidates. **Do not choose them yourself, do not add to the list, and
do not drop one.** They are computed from the dependency graph by the app, and the app compares
the set it asked about against the set in the file to decide when to run you again. Ranking a
different set than you were given makes those two permanently disagree, which triggers a rerun
on every finished session — an infinite loop that looks like a working feature.

If no slugs are given, stop and say so. Guessing is the one failure mode that is expensive.

---

## What you are being asked for

The app already knows the mechanical facts — which specs unblock the most work, task counts,
statuses. It computes those for free and does not need you for them.

You are being asked for the two things that require actually reading a spec:

- **`headless_score`** (integer 0–10): how much of this spec's remaining work could a headless
  session complete without stopping to ask a human? High means the tasks are concrete, the
  decisions are made, and the spec says what "done" looks like. Low means the tasks are vague
  ("improve the layout"), the spec leaves choices open, or the work needs visual/product
  judgement, credentials, or an external service.
- **`momentum`** (short phrase, ≤ 24 chars): what a person would say glancing at it. Examples:
  `spike 60% done`, `4/10 shipped`, `spec thin`, `not started`, `blocked on auth`.

## Workflow

### Step 1: Read each candidate

For each slug, read `.mm/specs/<slug>/spec.md` and its task list. Look at:

- how many tasks exist, and how many are complete
- whether the tasks are concrete enough to execute without clarification
- whether requirements are stated or still open questions
- anything that obviously needs a human (design calls, credentials, external accounts)

### Step 2: Score honestly

A low score is useful information, not a failure. A spec that scores 3/10 because its tasks are
vague is telling the user to shape it before running it — that is exactly what this surface is
for. Do not inflate scores to make the list look ready.

Score the REMAINING work, not the whole spec. A spec that is 90% done with two concrete tasks
left is highly doable, even if the early tasks were hard.

### Step 3: Write `.mm/product/next.json`

Write exactly this shape, with one entry per slug you were given, in the order you were given:

```json
{
  "ranked_at": "<current UTC time, ISO 8601>",
  "candidates": [
    {
      "slug": "2026-08-17-example-spec",
      "headless_score": 8,
      "momentum": "4/10 shipped",
      "rationale": "Tasks name files and assertions; the two open ones are mechanical."
    }
  ]
}
```

- `rationale` is one sentence, and is for a human skimming — say what drove the score.
- Do **not** write an `unblocks` field. The app recomputes that from the dependency graph on
  every read, and a stale copy in this file would just be a second source of truth.
- Do **not** write a `snapshot` field. The app owns it — it records what its own numbers were
  when it asked you, and that is what the rerun gate compares. If you write one, you are
  guessing at values the app already knows exactly.
- Preserve the file's other keys if any exist that are not listed here.

### Step 4: Report

One line per candidate: slug, score, momentum. Then stop. Do not start any of the work you just
ranked — deciding what to run is the user's click, not yours.
