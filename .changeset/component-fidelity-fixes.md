---
'@southleft/al-web-components': patch
'@southleft/al-react': patch
---

Component fidelity fixes found by rendering generated pages against the published package:

- `al-list-item`: an `isCurrent` item now pairs its primary fill with the on-primary text colour (`content-primary-weak`, as `al-button` primary does) instead of inheriting dark text, and its rendered link carries `aria-current="page"`. `--al-list-item-link-hover-background` still overrides the fill.
- `al-table`: data-driven header cells get the same padding as body cells (only sortable headers, whose button fills the cell, drop it). `data` cell values may be strings or DOM nodes, e.g. an `al-badge` element.
- `al-progress`: the fill, circle and label reflect `currentProgress` (attribute or property) on first render and on every update, not only after `change()`.
- `al-pagination`: the default `pageSizeOptions` is now `[10, 20, 40, 60, 80, 100]`, so the default `pageSize` of 10 is one of the options.
- `css/main.css`: resets the browser's default 8px `body` margin (in the `al.reset` layer) so full-width bars such as `al-header` and `al-footer` are no longer inset.
- `al-icon`: the "not registered and no resolver is installed" error is deferred and re-checked, and installing a resolver re-renders waiting icons, so importing the package root before `components/icon/lazy` no longer logs an error per icon. A genuinely missing glyph still logs once.
