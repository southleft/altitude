---
'al-web-components': major
'al-react': major
---

Replace the 37 hand-authored icons with the full Phosphor set (1,512 icons, regular weight, MIT) via a new `@phosphor-icons/core` devDependency.

**New canonical API.** `<al-icon name="caret-down">` resolves against a registry. Register the icons you use for a tree-shakeable, synchronous, SSR-safe render:

```ts
import { caretDown } from 'al-web-components/dist/components/icon/glyphs.js';
import { registerIcons } from 'al-web-components/dist/components/icon/registry.js';
registerIcons({ 'caret-down': caretDown });
```

Opt into `al-web-components/dist/components/icon/lazy.js` when icon names come from data you don't control.

**Breaking:**

- The 37 `<al-icon-*>` elements and `ALIcon*` React wrappers still exist and are still exported, but now render Phosphor artwork — **icons look different**, and Phosphor's regular weight is heavier than the old line work. They are deprecated and will be removed in 3.0.
- The icon webfont is removed. `.icon-<name>` classes and the `iconfont` `@font-face` are gone; `dist/fonts/iconfont.css` is an empty deprecation stub for one minor version.
- `<al-icon-list>` and `<al-icon name="list">` intentionally render different artwork — name lookup checks the Phosphor catalog before the legacy alias map. Migrate to `<al-icon name="list-dashes">`.

**Fixed:** `<al-icon>` used `aria-labelledby` for `iconTitle`, which takes IDREFs — icons with a title were announced as unlabelled. It now emits `aria-label`.

See `MIGRATION.md` § 4b for the full legacy → Phosphor name map.
