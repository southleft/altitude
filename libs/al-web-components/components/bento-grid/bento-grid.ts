import { html, unsafeCSS } from 'lit';
import { ALElement } from '../ALElement';
import styles from './bento-grid.scss';

/**
 * Component: al-bento-grid
 *
 * An asymmetric feature-grid organism for marketing pages — a 12-column,
 * auto-row CSS grid container. Compose it with `<al-bento-item>` children
 * (each declaring `colSpan`/`rowSpan`) for the classic "bento box" layout,
 * or drop in arbitrary content directly. Collapses to a single column below
 * the medium breakpoint so an asymmetric desktop layout never produces
 * unreadably narrow tiles on small screens.
 *
 * @slot - Grid items — typically `<al-bento-item>`, but any content is accepted.
 * @cssproperty --al-bento-grid-gap - Gap between grid cells. Defaults to the theme space ramp.
 * @cssproperty --al-bento-grid-row-height - Height of one implicit grid row. Defaults to the theme space ramp.
 */
export class ALBentoGrid extends ALElement {
  static el = 'al-bento-grid';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-bento-grid');

    return html`
      <div class="${componentClassNames}">
        <slot></slot>
      </div>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALBentoGrid.el) === undefined) {
  customElements.define(ALBentoGrid.el, ALBentoGrid);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-bento-grid': ALBentoGrid;
  }
}
