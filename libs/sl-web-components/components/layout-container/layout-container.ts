import { html, unsafeCSS } from 'lit';
import { SLElement } from '../SLElement';
import styles from './layout-container.scss';

/**
 * Component: sl-layout-container
 *
 * Layout Container caps the width of content sections and centers content within it.
 */
export class SLLayoutContainer extends SLElement {
  static el = 'sl-layout-container';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  render() {
    const componentClassName = this.componentClassNames('sl-l-layout-container', {});

    return html`
      <div class="${componentClassName}">
        <slot></slot>
      </div>
    `;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLLayoutContainer.el) === undefined) {
  customElements.define(SLLayoutContainer.el, SLLayoutContainer);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-layout-container': SLLayoutContainer;
  }
}
