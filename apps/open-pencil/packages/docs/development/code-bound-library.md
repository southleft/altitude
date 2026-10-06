---
title: Code-Bound Component Library
description: How a design system's code generates an OpenPencil component library, how components record their code identity, and how canvas↔code parity is checked.
---

# Code-bound component library

A component can record which code element renders it. With that identity in place, a design system's code can generate the canvas library, instances export as real components, and a headless check can compare the canvas with the code it came from.

## Code binding

`codeBinding` is an optional field on `COMPONENT` and `COMPONENT_SET` nodes (`CodeBinding` in `@open-pencil/scene-graph`):

```ts
interface CodeBinding {
  tagName: string // 'al-button'
  package?: string // '@southleft/al-web-components'
  importPath?: string // module that registers the element
  react?: { importPath: string; component: string } // '@southleft/al-react', 'ALButton'
  props: CodeBindingProp[] // component property → attribute
  slots: CodeBindingSlot[] // property or layer → slot
  attributes?: Record<string, string> // fixed attributes, e.g. an icon's name
  events?: string[]
  parts?: string[]
}

interface CodeBindingProp {
  property: string // canvas property: 'Size'
  attribute: string // element attribute: 'size'
  type: 'enum' | 'boolean' | 'string' | 'number'
  values?: Record<string, string> // canvas option → code value: { Md: 'md' }
}
```

- A VARIANT property maps option labels to code values; a label with no entry omits the attribute. One canvas axis may drive several attributes (`State=Disabled` → `isDisabled`).
- TEXT and BOOLEAN properties pass their value through. A boolean attribute is emitted only when true.
- Slots name the TEXT property that fills them, or the BOOLEAN/INSTANCE_SWAP pair that shows a placed component. The placed component renders through its own binding.

Instances never copy the binding; `codeBindingOwner()` resolves it through the main component and its set, and `resolveInstanceCodeElement()` turns the instance's current property values into a tag, attributes, and slot content.

The binding is copied with nodes, kept by undo, carried in library revisions (it is part of an asset's content hash), saved in `.fig` files as OpenPencil plugin data, and carried through HTML as the `data-op-code` design fact.

## Code generation

| Output                           | Code-bound instance                                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTML (`@open-pencil/dom-css`)    | `<al-button size="sm" isPill="true">Send<al-icon name="check-circle" slot="before"></al-icon></al-button>`, with the instance's `data-op-*` facts |
| React JSX (`tailwind` format)    | `<ALButton size="sm" isPill>Send<al-icon … /></ALButton>`, or the custom element tag without a React binding                                      |
| Design-JSX (`openpencil` format) | `<Instance component="Button" Size="Sm" />`, which renders back to the same variant                                                               |

The element owns its internal styling, so the instance's layers are not emitted as boxes. Re-importing the HTML restores the instance and its overrides from the design facts.

## Altitude library builder

`tools/altitude` builds the library for the Altitude design system from its code:

```sh
bun run open-pencil altitude build-library <altitude-root> --out altitude.fig
bun run open-pencil altitude build-library <altitude-root> --publish --catalog ./libraries
bun run open-pencil altitude canvas-contracts <altitude-root> --out ./canvas
```

The command is registered through `OPENPENCIL_CLI_EXTENSIONS`, which the root `open-pencil` script sets; the published CLI carries no Altitude code. Any module whose default export is `{ name, command }` can be added the same way.

The builder:

1. Imports the Altitude DTCG tokens with the Altitude preset, so variable ids derive from token paths.
2. Reads every code contract (`.altitude/contracts/<project>/*.contract.json`), the Custom Elements Manifest, and the `@southleft/al-react` wrappers.
3. Builds one `COMPONENT_SET` per contract with measured anatomy, named after the contract. Variant axes come from every VARIANT-kind Figma binding (paired bindings merge, `State` joins the styled states), from measured case dimensions that pair with a boolean prop, and from uncurated, non-behavioural enum props while the set stays within 256 variants. Omitted and behavioural props never fan out.
4. Lays out each variant from its measured case tree as auto-layout frames and binds fills, strokes, radii, padding, gaps, sizes, opacity, and text colour and size to the imported variables, layering `conditionalBindings` per variant and state and `stateOverrides` per node.
5. Adds `Text`, `Slot Before`/`Slot After`, `Icon Before`/`Icon After`, and a TEXT or BOOLEAN property for every other non-omitted prop, so the canvas carries the whole API for code generation.

Contracts without measured anatomy are reported as named skips. Tokens no canvas field can carry (composite shadows, z-index, font weight, outline offset) are left unbound and listed per component.

Every component carries a stable `componentKey` (`altitude/<tag>/<variant>`) and every property a stable id. Rebuilding from the same inputs gives the same library revision, so `--publish` publishes only when an asset changed and library update review shows real changes only.

Library revisions now also carry the variables their components bind (with alias targets and collections), and materializing an asset adds the variables the consumer does not already have.

## Canvas↔code parity

`canvas-contracts` emits one canvas contract per set in the shape of Altitude's `canvas-contract.schema.json`. The schema was written for Figma reads and forbids extra fields, so `figma.fileKey` is `open-pencil:<library id>` and `figma.nodeId` is the set's `componentKey`; both are stated in `degradations`. Token lists hold variable names, unioned across every variant.

On the Altitude side, `pnpm run canvas:parity` builds the library headlessly, runs the unchanged `diffContracts()` against each code contract, and reports per component:

- **API parity**: props, variant axes and values, slots, and states.
- **Token parity**: contract bindings bound to the same variable somewhere on the canvas.
- **Disagreements**: the differ's own list.

It exits 1 when the aggregate falls below its floors (`--floor-api`, `--floor-token`). Visual parity, a pixel comparison per case, is not measured yet.
