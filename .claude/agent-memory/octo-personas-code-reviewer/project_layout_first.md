---
name: project_layout_first
description: Altitude's layout-first rule — a LOCKED decision; what to flag and what NOT to flag in reviews
metadata:
  type: project
---

LOCKED decision (v2): `<al-layout>` is Altitude's single arrangement primitive. Removed as pure-arrangement wrappers: `al-button-group`, `al-layout-container`, `al-layout-section`, `al-bento-grid`, `al-split-content`, `al-chip-group`, `al-toast-group`, and the `sidebar-*` layout variants. Surviving groups own semantics only: `al-checkbox-group` (fieldset/legend + cascade), `al-radio-group` (+ roving selection), `al-toggle-button-group` (single-select state).

FLAG in reviews: a new `*-group`/`*-container`/wrapper component owning no behavior/ARIA/state; `direction`/`orientation`/`gap`/`align`/`justify`/`wrap` props added to any component; hand-rolled flex/grid in a component's `.scss` arranging SLOTTED children; raw light-DOM `<div>`s with `al-u-*` classes in slot content (utilities don't adopt there).

Do NOT flag: correct `<al-layout>` usage (including deep nesting — that is the intended pattern); internal shadow-DOM flex/grid inside an atom (icon-against-label positioning is exempt); the three surviving semantic groups existing; `orientation` on the internal menu controller (keyboard nav direction, not layout).

Authority: `AGENTS.md` "Arrangement vs. semantics" and the new-component blocker checklist. Do not relitigate.
