# Contrast and parity adjudication — 25 November 2026

The owner asked for two things: resolve any dark-mode contrast problems in Altitude's components, and, where Figma and code disagree, decide which side follows UX and accessibility best practice and fix the other one.

Decisions follow the split in `altitude-figma-repair` ("Who is right"): code owns token values, token usage and whether a variant exists; the canvas owns axis labels. The one place this record overrides code is contrast, where code itself fell short of WCAG.

## How the drift was found

`figma_check_library_parity` (figma-console-mcp) paired the Figma library with `libs/al-web-components` by name, then compared each pair's variant axes and component properties against `custom-elements.json`. It honours the contracts' existing curation (`omit`, `pairWith`) and only compares the props each contract declares. `al-react` wraps the same elements through `@lit/react`, so one manifest covers both packages; the React and Web Components libraries match each other except for React's `Icons` helper folder.

| | Before | After this pass |
|---|---|---|
| Components paired (Figma ↔ code) | 41 | 41 |
| Paired and prop-for-prop in sync | 28 | 32 (the 9 left: 7 pending Figma additions, 2 accepted as is) |
| Code components with no Figma set | 27 | 27 (not in scope; listed at the end) |

## 1. Contrast: form-control borders (fixed, code and Figma)

**Finding.** Input, Textarea, Range (via `al-input`), Checkbox, Radio, Input Stepper and the File Upload drop zone drew their boundary with `border-neutral-default`: 1.52–1.67:1 in dark mode, 1.31–1.50:1 in light. The field fill sits about 1.1:1 against the page, so the border is the only visual information identifying the control. WCAG 1.4.11 requires 3:1 for that. `check-palette-contrast.mjs` held these rows to the 1.2:1 decorative-hairline floor, which is why the gate stayed green.

**Decision: code was wrong.** Control boundaries are meaningful non-text, not decoration.

**Fix** (branch `fix/control-border-contrast`):
- Controls rest on `border-neutral-strong`. Light mode moves from `neutral.400` (2.22–2.53:1) to `neutral.500`. Result: 3.77–4.32:1 on page and surface in both modes.
- New `border-neutral-bold` completes the neutral scale (every other hue already had faint…bold) and carries the hover state, so hover stays distinct from rest: dark `neutral.400` (6.68:1), light `neutral.600` (5.31:1). Southleft light overrides strong to `neutral.700`, so its bold is `neutral.800` to keep hover stronger than rest.
- Checkbox and radio boxes use `border-width-md` (2px). The Figma library already drew them at 2px; on an 18px control the heavier edge is the better practice for low-vision users. Figma's box colour used a text token (`content/neutral-default`); it now uses the border token, as code does.
- Decorative edges (dividers, tables, accordion, drawer) stay on `border-neutral-default`. WCAG exempts them.
- The palette gate now holds control borders (rest, page, hover) to 3:1. 62 pairings pass in both modes.
- Figma: `border/neutral-strong` (Light) re-aliased, `border/neutral-bold` created, 36 variant strokes rebound in place (Input, Textarea, File Upload, Input Stepper, Checkbox, Radio). File Upload's Hover variant now uses `border/primary-default`, matching code.

Verified with rendered dark/light screenshots (computed border `#7c7a70`; checkbox/radio 2px), the token build, `check:token-usage`, contract drift, and Figma screenshots.

## 2. Drift decisions

### Figma gains it (code is right; designers need to specify it)

| Component | Code | Decision | Status |
|---|---|---|---|
| Select | `isDisabled`, `isError` | Error and disabled states are core to accessible form design | **Done**: `State` axis (Default, Error, Disabled), nested Input and Field Note states |
| Combobox | `isDisabled`, `isError` | Same | **Done** |
| Heading | `isBold` (paired to `Weight`, which had only Default) | Add the weight code ships | **Done**: `Weight=Bold` uses each size's semibold style, as `.al-is-bold` does |
| Textarea | `hideLabel` | Match Input's authoring controls | **Done**: `Text`, `Show Label`, `Show Helper` properties |
| Range | `hideLabel`, `isError` | Same | **Done**: `Show Label`, `State=Error` |
| Range | `hasTooltip` | Value bubble above the thumb | Pending: Figma's Output variants already contain a tooltip container; needs a visual comparison before mapping |
| Input | `labelPosition: top \| inset` | The inset label stays visible, so it is an accessible pattern; designers need it | Pending |
| Link | `variant: xs \| sm \| lg` | Add the sizes | Pending |
| Input Stepper | `variant: segmented \| trailing` | Add the trailing layout | Pending |
| Card | `layout: row` | Add the row layout | Pending |
| Popover | `isDismissible`, `variant: menu` | Add the close-button toggle and the unpadded menu variant | Pending |
| Empty State | `heading`, `description` | One `Text` property cannot specify both; expose both | Pending (contract currently omits them) |
| Icon | `size: xs…xxxl` | Sizes should snap to the scale rather than free resizing | Pending; converting the standalone Icon to a set needs care to keep instances |

### Omitted from Figma (recorded as `omit` in the contracts)

| Component | Prop | Why |
|---|---|---|
| Select | `align`, `hasSearch` | Affect the open dropdown panel only; the Figma set draws the closed field |
| Drawer | `hasBackdrop` | A page overlay, not part of the drawer itself |
| Card | `fill` | Sizing behaviour; Figma expresses it with Fill container |

Menu `hasOverflow`, Tabs `isScrollable` and Toggle Button `hasPopover` are computed at runtime and were already absent from the contracts' public props, so no curation was needed.

### Accepted as is

- **Popover positions.** Figma shows the four sides; code's seven edge alignments (`bottom-right`, `top-left`, …) are placement relative to the trigger, not appearance.
- **Progress `Text`.** It is the rendered value label, which code computes.

No code change was needed for any drift item: nothing on the code side broke a UX or accessibility practice.

## Verification

- Contracts: `--check` 102/102 and 25/25, `--check-drift` 102 match / 0 drifted, `--check-determinism`, `build-component-docs`, `gate:contracts` — all pass.
- `parity:refresh` observed 40 sets and recorded the edits (Command Palette is mapped but missing live, as before).
- **Not stamped.** `parity:synced` requires a `check-parity` receipt, which needs generated ops and a measured spec. On this macOS machine `measure-components.mjs` cannot run its esbuild step (it executes the native esbuild binary through Node); `--no-bundle` with a prebuilt bundle works. A fresh measurement also re-derives 29 contracts whose anatomy had gone stale against current code (for example Button's `al-c-button--md` class), which is unrelated to this pass and was left out of it. Run `check-parity` and `parity:synced` in the usual environment.
- The three React wrapper-event unit test failures (Calendar, CheckboxGroup, wrapper-events) fail identically on `main`.

## Not in scope: code components with no Figma set

Accordion, Accordion Panel, Alert, Announcement, Avatar, Calendar, Command Palette, Date Picker, Date Time Picker, Dropdown Panel, Focus Trap, Footer, Header, Layout, List, Logo, Search, Skeleton, Spinner, Stat, Stepper, Stepper Item, Testimonial, Theme, Theme Switcher, Time Selector List, Toast. Some are intentionally Figma-less (Focus Trap, Theme, Layout); the rest need generation through `altitude-figma-generate`.
