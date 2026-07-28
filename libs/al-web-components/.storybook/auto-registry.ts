// Sets the auto-registration flag as its own module so it can be imported
// FIRST from `preview.ts`, before any component module in the preview's
// import graph is evaluated.
//
// WHY THIS IS NOT JUST A LINE IN preview.ts (R5 / spec risk R-1):
// `components/theme/theme.ts:58-60` self-registers only when
// `globalThis.alAutoRegistry === true` *at module-evaluation time*. ES modules
// evaluate every static import of a module before that module's own body runs,
// so an assignment in the body of `preview.ts` happens AFTER any component it
// imports has already read the flag — and read it as `undefined`. The element
// then never upgrades, `<al-theme>` renders as an unknown element with no
// shadow root, and every `:host([mode|density|contrast])` rule silently
// vanishes while the brand stylesheet swap keeps working (so colours still
// change and the failure looks like "density does nothing").
//
// Importing this module first makes the flag true before the component graph
// is evaluated. `with-preset.ts` additionally defines `al-theme` defensively,
// so reordering the imports in `preview.ts` cannot resurrect the bug.
(globalThis as any).alAutoRegistry = true;

export {};
