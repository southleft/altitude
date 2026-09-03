# Figma Code Connect

Figma Dev Mode shows whatever code you give it. Given nothing, it guesses — and
a guessed snippet is worse than none, because it looks authoritative. These
files hand it the real Altitude markup instead.

## They are generated. Do not hand-edit them.

Everything Code Connect needs is already a recorded fact in
`.altitude/contracts/altitude/al-button.contract.json` and its 101 siblings —
the Figma node id, the variant axes, which attribute each prop writes, the
slots. That same contract drives Figma generation and parity, so deriving the
Code Connect file from it is what stops the Dev Mode snippet from disagreeing
with the set it is attached to. Hand-authored `*.figma.tsx` files are the Code
Connect norm, and they rot exactly the way this repo's other hand-written
surfaces have rotted.

    node scripts/contracts/build-code-connect.mjs            # write
    node scripts/contracts/build-code-connect.mjs --check    # drift gate
    node scripts/contracts/build-code-connect.mjs --component al-button

`--check` re-derives every file in memory and byte-compares it against disk,
naming each file that drifted, is missing, or is an orphan. Same principle as
`check:llms` and `check:contract-docs`: a generated artifact is gated by
re-running its generator.

## What is generated

Under `.altitude/code-connect/altitude/`, two files per covered component —
`<tag>.html.figma.ts` (web component) and `<tag>.react.figma.tsx` (the
`@southleft/al-react` wrapper, parsed out of `libs/al-react/src/components/`).
Altitude ships both surfaces, so Dev Mode should show both.

**34 of 102 components are covered. 68 are not**, because their contract carries
no pinned Figma `nodeId` — 37 of those are icons and layout/behaviour components
with no component set to bind to. Every one is named in `skipped.json`, along
with every `omit`ted prop, every variant option that matches no code value,
every code value with no Figma option, and every slot rendered as a placeholder.
Silence is the only forbidden failure: that report is byte-gated too, so a
degradation cannot appear or vanish without showing up in a diff.

**The `southleft` project is refused, not generated.** It was repointed on
2026-09-02 to a re-duplicated Figma file (see the decoy entries in
`.altitude/ds-projects.json`), so its pinned node ids address a retired
document. Re-seed them before lifting the refusal.

## Publishing (owner-driven, not automated)

    npx figma connect publish --config <config>

Two preconditions this repo does **not** meet today, both deliberate:
`@figma/code-connect` is not installed (the generated files import it; nothing
compiles or lints them — see the ignore entry in `eslint.config.js`), and no
Figma access token is configured. Install and authenticate locally, then publish
each surface against its own emitted config — Code Connect allows one parser per
config, hence two. Those two configs are the generator's reading of the
documented config shape; they have never been run here.
