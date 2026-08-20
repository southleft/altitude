import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../ALElement';
import styles from './empty-state.scss';

/**
 * Component: al-empty-state
 *
 * A centered "nothing here yet" placeholder — empty search results, empty
 * tables/lists, zero-data dashboard states.
 *
 * @slot icon - Optional icon or illustration, rendered above the heading.
 * @slot actions - Optional action row (buttons/links), rendered below the description.
 */
export class ALEmptyState extends ALElement {
  static el = 'al-empty-state';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * The empty-state heading.
   */
  @property()
  accessor heading: string;

  /**
   * Supporting description text.
   */
  @property()
  accessor description: string;

  render() {
    const componentClassNames = this.componentClassNames('al-c-empty-state');

    return html`
      <div class="${componentClassNames}" part="container">
        ${this.slotNotEmpty('icon')
          ? html`
              <div class="al-c-empty-state__icon">
                <slot name="icon"></slot>
              </div>
            `
          : ''}
        ${this.heading ? html`<p class="al-c-empty-state__heading">${this.heading}</p>` : ''}
        ${this.description ? html`<p class="al-c-empty-state__description">${this.description}</p>` : ''}
        ${this.slotNotEmpty('actions')
          ? html`
              <div class="al-c-empty-state__actions">
                <slot name="actions"></slot>
              </div>
            `
          : ''}
      </div>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALEmptyState.el) === undefined) {
  customElements.define(ALEmptyState.el, ALEmptyState);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-empty-state': ALEmptyState;
  }
}
