import { html, unsafeCSS } from 'lit';
import { SLElement } from '../SLElement';
import styles from './grid-item.scss';

/**
 * @slot - The content of the grid item
 */
export class SLGridItem extends SLElement {
  static el = 'sl-grid-item';

  static get styles() {
    return unsafeCSS(styles);
  }

  render() {
    const componentClassName = this.componentClassNames('sl-c-grid__item', {});

    return html`
      <div class="${componentClassName}">
        <slot></slot>
      </div>
    `;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLGridItem.el) === undefined) {
  customElements.define(SLGridItem.el, SLGridItem);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-grid-item': SLGridItem;
  }
}