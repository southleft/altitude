# Task E — Which side wins? (attempt {{ATTEMPT}})

A Figma component set and its code component disagree. Your job is to decide
**which side should be treated as the source of truth for this one
disagreement** — not to fix anything.

## The disagreement

Dimension: `{{DIMENSION}}`

{{SCENARIO}}

## Answer with exactly one of

| `winner` | Means |
| --- | --- |
| `code` | The code side is right. The Figma set should change. |
| `canvas` | The Figma set is right (or is a legitimate design-surface expression). The code side, or the contract's curation, should change — not the canvas. |
| `ask-a-human` | This cannot be settled from the two artifacts alone. Say what a person has to decide. |

`ask-a-human` is a real answer, not an escape hatch. Some of these genuinely
require a person — and some of them look like they do but are settled by a
documented rule. **Answering `ask-a-human` to everything scores as badly as
answering `code` to everything.** Both are ways of not reading the rule.

## Where the rule lives

The Altitude repository documents which side owns which kind of fact. Read it
before answering — the answer is a repository convention, not a general
software-engineering intuition, and two of the rows are genuinely
counter-intuitive.

Start from `.claude/skills/altitude-figma-repair/SKILL.md` ("Who is right —
code or canvas?"), and note that `CLAUDE.md` states the token generation
direction explicitly.

## What to return

Strict JSON matching the direction schema:

- `winner` — one of the three values above.
- `justification` — the RULE that decides it, in one or two sentences. Cite
  where the rule comes from if you can. A justification that only restates the
  scenario is not a justification.
- `action` — the concrete next step (e.g. "fix the Figma variable's value",
  "curate `pairWith` on the code prop", "refresh the parity observation first").
- `confidence` — `high`, `medium` or `low`. Be honest; a low-confidence right
  answer is more useful than a high-confidence guess.
