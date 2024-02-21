import { html, unsafeCSS } from 'lit';
import { ALElement } from '../ALElement';
import styles from './layout-container.scss';

/**
 * Component: al-layout-container
 *
 * Layout Container caps the width of content sections and centers content within it.
 */
export class ALLayoutContainer extends ALElement {
  static el = 'al-layout-container';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  render() {
    const componentClassName = this.componentClassNames('al-l-layout-container', {});

    return html`
      <div class="${componentClassName}">
        <slot></slot>
      </div>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALLayoutContainer.el) === undefined) {
  customElements.define(ALLayoutContainer.el, ALLayoutContainer);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-layout-container': ALLayoutContainer;
  }
}
