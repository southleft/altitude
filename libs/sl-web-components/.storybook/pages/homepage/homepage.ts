import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

/**
 * Page: l-homepage
 * @slot - The pages content
 */
@customElement('homepage')
export class Homepage extends LitElement {
  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Append to the class name. Used for passing in utility classes
   */
  @property()
  accessor styleModifier: string;

  render() {
    const componentClassName = classMap({'l-homepage': true, [this.styleModifier]: !!this.styleModifier });

    return html`
      <div class="${componentClassName}">
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'homepage': Homepage;
  }
}
