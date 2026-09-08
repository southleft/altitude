# Contract ↔ Figma coverage

The current audit is [2026-09-08](../audits/2026-09-08/REPORT.md); implementation status is tracked in [REMEDIATION.md](../audits/2026-09-08/REMEDIATION.md). These are dated observations, not a live certification. The previous coverage table and September 6 repair notes are preserved in [coverage-before-remediation.md](../audits/2026-09-08/coverage-before-remediation.md).

## Evidence and scope

The September 8 audit found 34 canonical mapped component sets. All 34 had descriptions and documentation links, but important code components lacked canonical Figma coverage, including Card, Dialog, Drawer, Select, Popover and Tooltip. Scratch sets are not canonical coverage. The old August 26 claim of 35 generated sets described a scratch-page experiment, not 35 shipped, visually verified components.

Read current counts from the project's parity manifest and live canvas. Resolve the file through `.altitude/ds-projects.json`; never reuse a different project's node IDs. `pnpm run parity:pins` checks attached identities; a passing pin check proves neither visual nor API parity.

## Before generation or repair

1. Load the matching Figma skill. Metadata and in-place repairs must preserve the existing set and variant IDs. Generate only genuinely missing sets or explicitly authorized replacements.
2. Positively pin and assert the registry's file name and key inside the sandbox before writing.
3. Refresh measurements from the built library, then regenerate contracts. A measured trigger is not an open dialog; use the declared measurement root for overlays. Missing anatomy is a named blocker.
4. Inspect browser and Figma PNGs. A populated node tree or successful generator exit is insufficient. Record unresolved variables, nested components and unsupported layout as degradations.
5. Refresh canvas observations, contracts, docs and Code Connect after accepted changes. Generated output alone does not prove that Code Connect is published.

## Composition requirements

`emit-contracts.mjs` derives composition from source and carries measured anatomy. `derive-ops.mjs` translates nested component tags to Figma set names; `build-set-code.mjs` resolves canonical sets first. Nested components must remain instances, not rebuilt frames. The layout primitive may intentionally resolve to an arrangement frame because it has no visual set.

Nested variant choice, hidden branches, text content and slot controls require explicit verification against measured cases. Do not accept default-variant substitution merely because the referenced component exists. Preserve the owner's existing sets and instances while repairing these facts.

Retired layout wrappers must not be presented as current code components. Keep historical material clearly separated from canonical library pages. The removed Chip Group is a known audit finding, with `al-layout` as its supported arrangement replacement.

## Commands

```bash
node scripts/figma-atoms/measure-components.mjs --project altitude
node scripts/contracts/emit-contracts.mjs --project altitude --refresh
node scripts/contracts/extract-canvas.mjs --project altitude
node scripts/contracts/generate-figma.mjs --project altitude --component <missing-tag>
```

Run generation only after reading its skill, confirming that the set is missing and checking its dependencies. Use the repair workflow for an existing set. A failed visual comparison remains unresolved even when metadata, pins and build checks pass.
