import { html, unsafeCSS } from 'lit';
import { ALElement } from '../ALElement';
import styles from './layout-section.scss';

/**
 * Component: al-layout-section
 */
export class ALLayoutSection extends ALElement {
  static el = 'al-layout-section';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  render() {
    const componentClassName = this.componentClassNames('al-c-layout-section', {});

    return html`
      <section class="${componentClassName}">
        <slot></slot>
      </section>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALLayoutSection.el) === undefined) {
  customElements.define(ALLayoutSection.el, ALLayoutSection);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-layout-section': ALLayoutSection;
  }
}
