---
name: altitude-facts
description: "Ground code generation, code review or 'does al-X have Y' questions about Altitude's al-* components, --al-* tokens or the altitude MCP server in the actual shipped API instead of a plausible guess. Triggers: 'what attributes does al-button have', 'which token should I use for X', 'is there an al-* component for Y', 'what MCP tools/resources/prompts does altitude expose', 'write markup/code using al- components', 'review this snippet for design-system violations', 'write llms.txt-style content about Altitude'. Pairs with the altitude MCP server (Atlassian's MCP+skill pattern) — read this BEFORE writing or reviewing any al-* markup, ideally alongside an active MCP connection to the `altitude` server."
---

# altitude-facts

Grounding for USING the Altitude design system correctly — which `al-*`
elements, attributes, slots, events and `--al-*` tokens exist, and what the
`altitude` MCP server can do for you. This is not the component-authoring
flow (that's `altitude-component-authoring`) and it is not the Figma sync
flow (that's `altitude-figma-sync`) — this is the skill for the much more
common case: an agent about to write, or review, code that USES the library.

## 0. What is generated here, why, and where the line is drawn

**`GENERATED-FACTS.md` in this folder is machine-generated** by
`node scripts/build-agent-skill.mjs`, from the same committed artifacts the
docs site's own machine artifacts (`llms.txt`, `llms-components.txt`,
`llms-tokens.txt`) and the MCP capability matrix are built from:
`.altitude/ai-readiness/cem-digest.json`, `.altitude/ai-readiness/tokens-digest.json`,
`libs/altitude-mcp/CAPABILITY-MATRIX.md`, and `.altitude/a11y/report.json`.
`node scripts/build-agent-skill.mjs --check` (`pnpm run check:skills`) fails
the build if the tracked file has drifted from those sources — same
discipline as `check:llms` and `check-mcp-docs`. **Never hand-edit
`GENERATED-FACTS.md`** — regenerate it instead.

**This file (`SKILL.md`) is hand-written and stays that way.** The line drawn
here, and why:

- **Generated: names, counts, and per-tag "do not flag" caveats.** A
  component roster, its exact attribute/slot/event/CSS-part names, the
  token family list, the closed do-not-invent list, and the MCP tool /
  resource / prompt roster are pure facts that live in a JSON file and
  change every time a component ships or a token is renamed. Hand-typing
  them is exactly how the old `llms.txt` drifted to point at build
  artifacts it itself called "generated, not tracked" (see this spec's
  completed tasks) — the fix there was "generate it, gate it", and the
  fix here is the same fix applied to a skill instead of a doc page.
- **Hand-written: judgement.** Which skill to reach for, when a static file
  answers a question versus when you need a live tool call, how the pieces
  relate to each other, and the traps that cost someone an hour to find.
  A generator has no way to know that `al-button`'s primary variant is
  rendered by *omitting* an attribute rather than setting one to
  `"primary"` — a digest can record that fact once it's known (and it does,
  see `GENERATED-FACTS.md`'s caveats section), but deciding that this
  specific fact is the kind of thing worth recording as a caveat, and
  writing the sentence that explains it, is judgement. `altitude-figma-sync`
  is the proof this matters: its ~30 hard-won traps could not have been
  produced by pointing a script at a JSON file — every one was a bug that
  was actually hit and diagnosed.

Full per-attribute prose (types, long descriptions, worked examples) is
**deliberately not duplicated a third time** here. It already exists,
generated and gated, at the docs site's `llms-components.txt` /
`llms-tokens.txt` and via the live `altitude_get_component` /
`altitude_get_tokens` MCP tools. A third ~5000-line copy of the same
reference would itself be a drift risk with zero benefit over calling the
tool once. What's embedded in `GENERATED-FACTS.md` is exactly what you need
*before* you've decided a tool call is worth making: names (so "does this
exist" is answerable offline, with no MCP connection required) and the
caveats a live query would never present as a caveat.

## 1. Decide: static file, or live MCP call?

Read `GENERATED-FACTS.md`'s roster and caveats first — it costs nothing and
answers "does `al-foo` / `--al-theme-foo` / `foo` attribute exist" and "is
this weird thing I'm seeing actually sanctioned" without a tool round trip.

Reach for the live `altitude` MCP tools when you need any of:

- **The full contract for one component** (types, enum values, descriptions,
  CSS parts *and* CSS custom properties, docs URL) — `altitude_get_component`.
  `GENERATED-FACTS.md` gives you names only; this gives you the shape.
- **Resolved token values**, or a tier/brand/mode-scoped slice —
  `altitude_get_tokens`. The digest never carries resolved values (they're a
  build artifact, not a tracked source — see `.altitude/README.md` on the
  tokens pipeline).
- **Validate a snippet you're about to ship** — `altitude_validate` (or the
  `check_snippet_convention` prompt, which drafts the call and the
  code→fix self-heal loop for you). Do this before finishing any nontrivial
  chunk of `al-*` markup; it catches unknown tags/attributes, invalid enum
  values and type mismatches the same way CI does.
- **An icon** — `altitude_search_icons` returns the exact import path and
  `registerIcons()` snippet; don't guess a Phosphor name.
- **A theme** — `altitude_generate_theme` (or the `generate_brand_theme`
  prompt) derives a WCAG-AA override set from a short prompt.
- **Figma↔code parity for a component** — `altitude_check_parity` (or the
  `audit_component_parity` prompt); see `altitude-figma-sync` for the full
  flow if you're actually reconciling drift, not just checking status.
- **Which design-system project you're in** (altitude vs. southleft, and its
  Figma file / brand / docs scope) — `altitude_list_ds_projects`.

If the MCP server isn't connected in this session, `GENERATED-FACTS.md` and
the docs site's `llms-*.txt` files are the fallback — they carry the same
facts (components/tokens/rules), just without the tool's structured
error codes or resolved values.

## 2. The core rules (same ones the generated llms.txt states)

These hold regardless of which surface you're reading from — they are
enforced by real gates, not style preference:

1. Only use tokens/attributes/slots/events/elements that actually exist.
   An unknown `--al-*` custom property is **not an error** — CSS falls back
   silently, so a hallucinated token renders a page that looks right and
   is wrong. `scripts/check-token-usage.mjs --fail-on-phantom` and
   stylelint's `value-no-unknown-custom-properties` both gate this in CI;
   don't rely on the gate catching it before a human does.
2. Render inside `<al-theme brand="…">` — tokens are set on that host, not
   on `:root`.
3. Arrange slotted content with `<al-layout>` and its props. Do not
   hand-roll flex/grid on a wrapper, and do not invent a new `*-group`
   component for spacing — see AGENTS.md "Arrangement vs. semantics". The
   groups that exist (`al-checkbox-group`, `al-radio-group`,
   `al-toggle-button-group`) exist for SEMANTICS (fieldset/legend, roving
   keyboard selection, single-select state), never for spacing.
4. Pick exactly one registration path per document (`window.alAutoRegistry`,
   the React wrapper import, or `registerAltitude({ mode: 'versioned' })`)
   — see `.altitude/REGISTRATION.md`. Mixing two in one document is a bug
   category of its own.
5. A missing accessibility result is not a pass. `GENERATED-FACTS.md`'s
   accessibility snapshot and `altitude://a11y-report` both distinguish
   "measured clean" from "never recorded".

## 3. Related skills

- **`altitude-component-authoring`** — you're adding a new `al-*` component
  or changing an existing one's public API. Read that skill instead of this
  one; it owns the plop → implementation → verification flow.
- **`altitude-figma-sync`** — you're reconciling the Figma library against
  the code (auditing variables, repairing or building component sets).

## 4. Hard-won caveats (hand-written; grows over time)

This section is for genuinely non-obvious things confirmed by reading the
source, in the same spirit as `altitude-figma-sync`'s numbered trap list.
It starts short because this skill is new — append here as real gotchas are
found, the same way the figma-sync skill's list grew from a handful of
entries to over thirty.

1. **A component's `doNotFlag` entries in `GENERATED-FACTS.md` are the
   single most valuable thing in this file for code review** — each one is
   a pattern that looks like a bug and is not (e.g. `al-button`'s primary
   variant being the *absence* of the `variant` attribute, or `al-icon`
   accepting any of 1,512 live Phosphor names with the ~37 `al-icon-*`
   legacy elements kept only as deprecated aliases). Check that section
   before flagging anything that "looks wrong" in an `al-*` usage.
2. **CEM digest attribute names are the JS property names** (camelCase,
   e.g. `isDisabled`, `hideText`), which Lit lowercases (not
   kebab-cases) into the actual HTML attribute automatically — and HTML
   attributes are case-insensitive on parse anyway, so writing either case
   in markup resolves the same way. Do not "fix" a camelCase attribute in
   generated HTML to kebab-case; there is no `is-disabled` form to convert
   it to.
3. **The digest is a snapshot, not a live query.** `GENERATED-FACTS.md` is
   regenerated on demand (`pnpm run skills:build`), not on every commit —
   if you suspect it's stale for a component you just changed, call
   `altitude_get_component` for the live answer rather than trusting a
   possibly-unregenerated file.
