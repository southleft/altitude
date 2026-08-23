import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../ALElement';
import styles from './layout.scss';

/**
 * Component: al-layout
 *
 * The single arrangement primitive for the design system. Layout owns three
 * orthogonal jobs, selected by `variant`:
 *
 * - **flow** (default) — stack or row content with `direction` / `gap` /
 *   `align` / `justify` / `wrap`.
 * - **constrained** — own the page measure. Children sit in a centred content
 *   column capped at `size`, with fluid gutter tracks either side. Any child
 *   marked `bleed` breaks out edge-to-edge.
 * - **grid** — an N-column grid (`columns`). Children span with the shared
 *   `.al-u-grid__item.col:N` classes; there is no second span system.
 * - **bento** — a 12-column auto-row grid for asymmetric feature tiles.
 *
 * Semantic components must not re-implement arrangement. A component that
 * groups things for MEANING (`al-checkbox-group`'s fieldset,
 * `al-radio-group`'s roving keyboard selection) keeps only that meaning and
 * nests its slotted content in an `<al-layout>`.
 *
 * @slot - The layout content. Under `variant="constrained"`, a child carrying
 *         the `bleed` attribute breaks out of the content column.
 * @cssproperty --al-layout-gap - Gap between children, for a value the `gap` prop's scale cannot name. An explicit `gap` prop still wins over it. Prefer the prop.
 * @cssproperty --al-layout-padding - The layout's own inset. Defaults to `0`. Needed because `:host` is `display: contents`, so padding set from outside is dropped. Under `variant="constrained"` use it for block padding only — inline insets there are the gutter tracks.
 * @cssproperty --al-layout-gutter - Gutter track width under `variant="constrained"`. Defaults to a fluid 20px–60px clamp.
 * @cssproperty --al-layout-measure - Content column width under `variant="constrained"`. Set via `size`.
 * @cssproperty --al-layout-columns - Column count under `variant="grid"`. Set via `columns`.
 * @cssproperty --al-layout-min-height - Height floor when `fullHeight` is set. Defaults to 100vh.
 */
export class ALLayout extends ALElement {
  static el = 'al-layout';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Style variant
   * - **default** a flow layout — a column, or a row with `direction="row"`
   * - **constrained** a centred content column with gutter tracks; children
   *   marked `bleed` break out edge-to-edge
   * - **grid** an N-column grid, sized by `columns`
   * - **bento** a 12-column auto-row grid for asymmetric feature tiles
   */
  @property()
  accessor variant: 'constrained' | 'grid' | 'bento';

  /**
   * Direction
   * - **column** (default) stacks children vertically
   * - **row** arranges children horizontally, centered on the cross axis
   */
  @property()
  accessor direction: 'row' | 'column';

  /**
   * Gap between children (default is 16px)
   * - **none** removes the gap
   * - **xs** 4px
   * - **sm** 8px
   * - **md** 16px (same as the default)
   * - **lg** 24px
   * - **xl** 32px
   */
  @property()
  accessor gap: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

  /**
   * Cross-axis alignment
   * - Defaults to `stretch` for a column and `center` for a row
   */
  @property()
  accessor align: 'start' | 'center' | 'end' | 'stretch';

  /**
   * Main-axis distribution
   */
  @property()
  accessor justify: 'start' | 'center' | 'end' | 'between';

  /**
   * Measure — the width of the centred content column under
   * `variant="constrained"`. Defaults to the theme's container width.
   */
  @property()
  accessor size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'full';

  /**
   * Gutter — the width of the tracks either side of the content column under
   * `variant="constrained"`. Defaults to a fluid 20px–60px clamp.
   */
  @property()
  accessor gutter: 'none' | 'sm' | 'md' | 'lg';

  /**
   * Column count under `variant="grid"` (1–12, default 12)
   */
  @property({ type: Number })
  accessor columns: number;

  /**
   * Keep the grid's columns at every width
   * - By default a grid collapses to a single column below the medium
   *   breakpoint so tiles never become unreadably narrow
   */
  @property({ type: Boolean })
  accessor noCollapse: boolean;

  /**
   * Allow children to wrap onto multiple lines
   */
  @property({ type: Boolean })
  accessor wrap: boolean;

  /**
   * Absorb the free space of a flex parent
   * - Needed when the layout is slotted into a flex container (such as a
   *   dialog or popover footer) and `justify` needs room to act on
   */
  @property({ type: Boolean })
  accessor grow: boolean;

  /**
   * Stretch children to fill the main axis
   */
  @property({ type: Boolean })
  accessor stretchItems: boolean;

  /**
   * Collapse a row into a column on small screens
   */
  @property({ type: Boolean })
  accessor responsive: boolean;

  /**
   * Fill at least the height of the viewport
   * - Opt in for page shells. Override the height with `--al-layout-min-height`
   */
  @property({ type: Boolean })
  accessor fullHeight: boolean;

  render() {
    const columns = this.columns >= 1 && this.columns <= 12 ? Math.floor(this.columns) : null;

    const componentClassName = this.componentClassNames('al-c-layout', {
      'al-c-layout--constrained': this.variant === 'constrained',
      'al-c-layout--grid': this.variant === 'grid',
      'al-c-layout--bento': this.variant === 'bento',
      'al-c-layout--row': this.direction === 'row',
      'al-c-layout--gap-none': this.gap === 'none',
      'al-c-layout--gap-xs': this.gap === 'xs',
      'al-c-layout--gap-sm': this.gap === 'sm',
      'al-c-layout--gap-md': this.gap === 'md',
      'al-c-layout--gap-lg': this.gap === 'lg',
      'al-c-layout--gap-xl': this.gap === 'xl',
      'al-c-layout--align-start': this.align === 'start',
      'al-c-layout--align-center': this.align === 'center',
      'al-c-layout--align-end': this.align === 'end',
      'al-c-layout--align-stretch': this.align === 'stretch',
      'al-c-layout--justify-start': this.justify === 'start',
      'al-c-layout--justify-center': this.justify === 'center',
      'al-c-layout--justify-end': this.justify === 'end',
      'al-c-layout--justify-between': this.justify === 'between',
      'al-c-layout--size-sm': this.size === 'sm',
      'al-c-layout--size-md': this.size === 'md',
      'al-c-layout--size-lg': this.size === 'lg',
      'al-c-layout--size-xl': this.size === 'xl',
      'al-c-layout--size-xxl': this.size === 'xxl',
      'al-c-layout--size-full': this.size === 'full',
      'al-c-layout--gutter-none': this.gutter === 'none',
      'al-c-layout--gutter-sm': this.gutter === 'sm',
      'al-c-layout--gutter-md': this.gutter === 'md',
      'al-c-layout--gutter-lg': this.gutter === 'lg',
      [`al-c-layout--cols-${columns}`]: columns !== null,
      'al-c-layout--no-collapse': this.noCollapse === true,
      'al-c-layout--wrap': this.wrap === true,
      'al-c-layout--grow': this.grow === true,
      'al-c-layout--stretch-items': this.stretchItems === true,
      'al-c-layout--responsive': this.responsive === true,
      'al-c-layout--full-height': this.fullHeight === true
    });

    return html`
      <div class="${componentClassName}">
        <slot></slot>
      </div>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALLayout.el) === undefined) {
  customElements.define(ALLayout.el, ALLayout);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-layout': ALLayout;
  }
}
