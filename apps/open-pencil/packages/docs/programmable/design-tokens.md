---
title: Design tokens
description: Import DTCG design tokens as variable collections and modes from the CLI, MCP, or the Variables panel, and re-import to update them in place.
---

# Design tokens

OpenPencil imports [Design Tokens Community Group](https://www.designtokens.org/tr/2025.10/format/) (DTCG) token files — JSON with `$value` and `$type` — as variable collections, modes, and variables. Importing the same tokens again updates the variables in place, so a token build can keep a canvas current.

The same importer runs everywhere:

- **Variables panel** — **Import tokens…** reads a folder, JSON files, or a ZIP archive, with an optional mapping preset. The import is one undoable step.
- **CLI** — `openpencil tokens import <dir|file> [--preset <name|file>] [--into doc.fig] [--prune] [--json]`.
- **MCP and AI tools** — `import_design_tokens` with `tokens` (one document) or `files` (documents keyed by relative path) and an optional `mapping`.

```bash
# Dry run: show what would be created and every token that does not import exactly
openpencil tokens import ./tokens --preset ./tokens.preset.json

# Write the variables into a document, creating it if it does not exist
openpencil tokens import ./tokens --preset ./tokens.preset.json --into design.fig
```

## Mappings

Without a mapping, every `*.json` file merges into one collection named **Tokens**, with later paths overriding earlier ones (and each override reported). A mapping describes a multi-file token tree:

```json
{
  "name": "acme",
  "layers": [
    { "files": ["primitives/*.json"] },
    { "files": ["theme/{mode}/*.json"] },
    { "files": ["brand/{brand}/*.json"] }
  ],
  "axes": [
    { "name": "mode", "modes": ["light", "dark"] },
    { "name": "brand", "modes": [{ "name": "acme", "label": "Acme" }, "partner"] }
  ],
  "collections": [
    { "name": "Primitives", "files": ["primitives/**"] },
    { "name": "Theme", "axes": ["mode"] },
    { "name": "Brand", "axes": ["brand", "mode"] }
  ],
  "naming": { "rename": [{ "from": "font-size.", "to": "typography/font-size/" }] },
  "cssVar": { "prefix": "acme" }
}
```

| Field | Meaning |
|---|---|
| `name` | Source id. Re-imports recognise their own variables by it. |
| `layers` | Files in override order; later definitions win. `{axis}` in a pattern makes the layer depend on that axis. `when: { axis: mode \| [modes] }` limits a layer to some modes. |
| `axes` | Independent dials such as mode, brand, density, contrast, shape, or motion. `default` sets the value used when a collection does not vary over the axis (first mode otherwise). |
| `collections` | Each token goes to the **first** collection whose `axes` include every axis the token varies over and whose `files` (defining file) and `tokens` (dot-path globs) filters accept it. A collection's modes are the cartesian product of its axes (`Acme / Dark`). Tokens no collection covers get a named fallback collection such as `Tokens · Brand`. |
| `naming` | `separator` (default `/`), `dropSegments` (default `["$root"]`), and `rename` prefix rewrites for variable names. |
| `cssVar` | When set, each variable records `codeSyntax.WEB = var(--<prefix>-<path>)`, the name code reads. |
| `composites` | `string` (default) or `skip` per composite type. |
| `exclude` | Token path globs to leave out. |
| `keepExtensions` | `$extensions` namespaces copied into variable metadata. |
| `omitFromCSSWhen` | `{ extension, property, values }`: keep the value but leave it out of CSS in modes whose definition carries that extension value. |
| `remBase` | Pixels per `rem` (default 16). |

A token varies over an axis when switching only that axis changes its authored value. An alias counts as its reference, because the variable alias keeps following its target, including into another collection. An alias into another collection resolves in that collection's active mode (or a node's explicit mode for it).

## Type mapping

Variables hold COLOR, FLOAT, STRING, or BOOLEAN. Metadata under `extensions["org.openpencil.dtcg"]` keeps the token path, resolved `$type`, authored unit, and source file.

| DTCG `$type` | Variable | Notes |
|---|---|---|
| `color` | COLOR | Strings and 2025 colour objects; non-sRGB spaces convert to sRGB. |
| `dimension` | FLOAT | `px` and `rem` store canvas pixels; other units store the number. The unit is kept, so CSS export writes `1rem`, `50%`. Unitless values read as px. |
| `duration` | FLOAT | Milliseconds, as Figma states durations; CSS export restores `s` or `ms`. |
| `number`, `fontWeight` | FLOAT | Weight names such as `semi-bold` map to numbers. |
| `fontFamily` | STRING | Arrays join into a CSS family list. |
| `cubicBezier` | STRING | `cubic-bezier(…)`; easing keywords pass through. |
| `strokeStyle` | STRING | Keywords exactly; object dash patterns approximate as `dashed` (named). |
| `shadow`, `border`, `transition` | STRING | CSS shorthand; the structured value stays in metadata. |
| `typography` | STRING | CSS `font` shorthand; `letterSpacing` and other sub-values the shorthand cannot carry stay in metadata (named). |
| `gradient` | STRING | `linear-gradient(…)` top to bottom; DTCG has no direction (named). |
| Non-standard types | inferred | Numbers and measures become FLOAT with their unit, strings STRING. |

Composites become CSS-string variables rather than text or effect styles because OpenPencil shared styles are currently read from `.fig` files, not created programmatically.

## Named degradations

The importer never drops a token silently. Every token that does not arrive as an exact variable is reported with a code: `invalid-value`, `unsupported-type`, `unresolved-alias`, `circular-alias`, `type-conflict`, `alias-flattened`, `composite-as-string`, `composite-skipped`, `lossy-value`, `mode-absent`, `conflicting-definition`, `invalid-name`, `unsupported-feature` (`$extends`, JSON-pointer `$ref`), or `invalid-document`. A value that fails in some modes only (for example `currentColor`) leaves the token absent there and reports it.

## Re-importing

Variables are matched by source and token path first, then by the stable id the importer assigned, then by name inside the target collection, which adopts variables a design file already has. Matched variables keep their ids, so node bindings survive value changes, moves between collections, and `.fig` round trips. Modes are matched by name; modes added by hand keep their values.

Tokens that disappear are reported as removed and kept. Pass `--prune` (`prune: true`) to delete them; that also removes their bindings.

## CSS export

`variableCollectionsToCSS()` from `@open-pencil/dom-css` names imported variables by their `codeSyntax.WEB` property, writes authored units, skips modes a token does not define, and accepts `modes` (collection id → mode id) to emit one theme combination as a single `:root` block. `tokenModeSelection(graph, { brand: 'acme', mode: 'dark' })` from `@open-pencil/core/io/formats/dtcg` builds that selection from axis values.

## Motion tokens

Duration roles (`animation/duration/role/{fast,base,slow}`) and easing roles (`animation/timing/role/{standard,emphasized}`) drive [component motion](/user-guide/motion): a transition that names a use case reads its role tokens, so switching the Motion collection's mode re-times it, and the reduced mode makes it instant. Transition composites import as CSS strings for reference, but motion never reads or exports them as one value; it expands the use case into its roles at each element, as Altitude's `al-motion-transition()` mixin does.

## Agent tools

Alongside `import_design_tokens`, agents manage variables with `add_mode`, `rename_mode`, `remove_mode`, `set_active_mode`, `set_variable` (mode id or name), and `set_variable_alias`. See the [MCP server](./mcp-server.md) tool list.
