---
'@southleft/al-web-components': minor
'@southleft/al-react': minor
---

Form-control borders now meet WCAG 1.4.11 (3:1 against the surface) in both modes. `al-input`, `al-textarea`, `al-range`, `al-checkbox`, `al-radio`, `al-input-stepper` and the `al-file-upload` drop zone used `border-neutral-default`, which measured 1.31–1.67:1; because the field fill sits close to the page, that border is what identifies the control.

- Controls now rest on `theme.color.border.neutral-strong`, and its light-mode value moves from `neutral.400` to `neutral.500` (3.77–4.32:1 on page and surface, both modes, both brands).
- New token `theme.color.border.neutral-bold` (`--al-theme-color-border-neutral-bold`) completes the neutral border scale and carries the control hover state, so hover stays visibly stronger than rest. Dark `neutral.400`, light `neutral.600`; the Southleft light brand uses `neutral.800`.
- `al-checkbox` and `al-radio` boxes use `border-width-md` (2px).
- Decorative edges (dividers, tables, accordion, drawer) keep `border-neutral-default`.
