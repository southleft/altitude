import { html, unsafeCSS } from 'lit';
import { SLElement } from '../SLElement';
import styles from './layout-section.scss';

/**
 * Component: sl-layout-section
 */
export class SLLayoutSection extends SLElement {
  static el = 'sl-layout-section';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  render() {
    const componentClassName = this.componentClassNames('sl-c-layout-section', {});

    return html`
      <section class="${componentClassName}">
        <slot></slot>
      </section>
    `;
  }
}

if ((globalThis as any).slAutoRegistry === true && customElements.get(SLLayoutSection.el) === undefined) {
  customElements.define(SLLayoutSection.el, SLLayoutSection);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-layout-section': SLLayoutSection;
  }
}
