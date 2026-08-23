// Process env for the Southleft Storybook. MUST be imported FIRST from
// `./main.ts` — nothing else may be imported before it.
//
// ES modules evaluate every static import before the importing module's body,
// so `process.env.X = ...` written in `main.ts`'s body would run AFTER
// `../.storybook/main.ts` (and everything it pulls in) had already evaluated.
// That is the same trap `.storybook/auto-registry.ts` exists for on the preview
// side; the fix is the same — put the assignment in a side-effect module and
// import it above the modules that read it. Static imports run in source order,
// so this is a guarantee rather than a hope.
//
// DS_PROJECT is read by `libs/altitude-mcp/src/lib/ds-project.mjs` (`--project`
// argv -> DS_PROJECT -> the registry default). It is what makes the parity
// emitter compute the SOUTHLEFT report — Figma file `Southleft V5`, manifest
// `.altitude/figma-sync/southleft/parity-manifest.json` — instead of Altitude's,
// and what makes it write `dist/parity.southleft.json` rather than clobbering
// Altitude's `dist/parity.json`. Everything else about the project (ports, brand
// title, Figma file) lives in `.altitude/ds-projects.json`; this is the one
// string that selects the entry.

process.env.DS_PROJECT = 'southleft';

export {};
