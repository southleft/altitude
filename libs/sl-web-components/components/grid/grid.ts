import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { SLElement } from '../SLElement';
import styles from './grid.scss';

/**
 * Component: sl-grid
 * - Grid provides a responsive layout that adapts to screen size and orientation, ensuring consistency across devices.
 * @slot - The grid items
 */
export class SLGrid extends SLElement {
  static el = 'sl-grid';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Style variant
   * - **side-by-side** yields a grid whose grid items display side-by-side (2 per row) on all screen sizes
   * - **2up** yields a grid whose grid items are stacked on small screens but display side-by-side when enough screen real estate is available to do so
   * - **2-3up** yields a grid whose grid items display side-by-side (2 per row) on small screens and 3 per row on md/lg screens
   * - **3up** yields a grid whose grid items are stacked on small screens, transforms to a 2-across pattern and then transforms again to a 3-across pattern
   * - **1-3up** yields a grid whose grid items are stacked on small screens and transforms to a 3-across pattern on larger screens
   * - **4up** yields a grid whose grid items are stacked on small screens, transforms to a 2-across pattern, transforms again to a 3-across pattern, and ultimately transforms to a 4-across pattern
   * - **2-3-4up** yields a grid whose grid items are 2-across on small screens, 3-across on medium screens, and ultimately transforms to a 4-across pattern on  lg screens
   * - **2-4up** yields a grid whose grid items are 2-across on small screens and ultimately transforms to a 4-across pattern on md/lg screens
   * - **1-2-4up** yields a grid whose grid items are stacked on small screens, transforms to a 2-across pattern, and ultimately transforms to a 4-across pattern
   * - **1-4up** yields a grid whose grid items are stacked on small screens, transforms to a 4-across pattern on medium/large screens
   * - **2-4-5up** yields a grid whose grid items are 2-across on small screens, 4-across pattern on md screens, and 5up on large screens
   * - **5up** yields a grid whose grid items are stacked on small screens, 2up on sm/md screens, 3up on md screens, 4up on md/lg screens, then 5up on lg screens
   * - **2-3-4-5up** yields a grid whose grid items are  2up on sm/md screens, 3up on md screens, 4up on md/lg screens, then 5up on lg screens
   */
  @property()
  accessor variant:
    | 'side-by-side'
    | '2up'
    | '2-3up'
    | '3up'
    | '1-3up'
    | '2-4up'
    | '2-3-4up'
    | '4up'
    | '1-4up'
    | '1-2-4up'
    | '2-4-5up'
    | '2-3-4-5up'
    | '5up'
    | '2-4-6up';

  /**
   * Style variant
   * - **none** yields a grid whose grid items are spaced without any gutter in between
   * - **sm** yields a grid whose grid items are spaced with a gap smaller than the default
   * - **lg** yields a grid whose grid items are spaced with a gap larger than the default
   */
  @property()
  accessor gap: 'none' | 'sm' | 'lg';

  /**
   * Break variant
   * -  **faster** breaks the grid at a smaller width than the default. Example: 2up grid breaks to 2 per row at smaller width than default
   * -  **slower** breaks the grid at a larger width than the default. Example: 2up grid breaks to 2 per row at larger width than default
   * -  **none** the grid does not break.
   */
  @property()
  accessor break: 'faster' | 'slower' | 'none';

  /**
   * Separators
   * 1. Adds lines between items
   */
  @property({ type: Boolean })
  accessor separators: boolean;

  /**
   * Height variant
   * - **auto** Prevents the grid from stretching so the grid items are staggered in height
   */
  @property()
  accessor height: 'auto';

  render() {
    const componentClassName = this.componentClassNames('sl-c-grid', {
      'sl-c-grid--side-by-side': this.variant === 'side-by-side',
      'sl-c-grid--2up': this.variant === '2up',
      'sl-c-grid--2-3up': this.variant === '2-3up',
      'sl-c-grid--3up': this.variant === '3up',
      'sl-c-grid--1-3up': this.variant === '1-3up',
      'sl-c-grid--4up': this.variant === '4up',
      'sl-c-grid--1-4up': this.variant === '1-4up',
      'sl-c-grid--2-3-4up': this.variant === '2-3-4up',
      'sl-c-grid--2-4up': this.variant === '2-4up',
      'sl-c-grid--1-2-4up': this.variant === '1-2-4up',
      'sl-c-grid--2-4-5up': this.variant === '2-4-5up',
      'sl-c-grid--2-3-4-5up': this.variant === '2-3-4-5up',
      'sl-c-grid--5up': this.variant === '5up',
      'sl-c-grid--2-4-6up': this.variant === '2-4-6up',
      'sl-c-grid--gap-none': this.gap === 'none',
      'sl-c-grid--gap-sm': this.gap === 'sm',
      'sl-c-grid--gap-lg': this.gap === 'lg',
      'sl-c-grid--break-faster': this.break === 'faster',
      'sl-c-grid--break-slower': this.break === 'slower',
      'sl-c-grid--break-none': this.break === 'none',
      'sl-c-grid--separators': this.separators === true,
      'sl-c-grid--height-auto': this.height === 'auto'
    });

    return html`
      <div class="${componentClassName}">
        <slot></slot>
      </div>
    `;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLGrid.el) === undefined) {
  customElements.define(SLGrid.el, SLGrid);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-grid': SLGrid;
  }
}
