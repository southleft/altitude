import { LitElement, html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import styles from './token-specimen.scss';

export class TokenSpecimen extends LitElement {
  static get styles() {
    return unsafeCSS(styles.toString());
  }

  @property()
  accessor styleModifier: string;

  @property()
  accessor variant: 'color' | 'animation' | 'border' | 'opacity' | 'shadow' | 'typography';

  @property()
  accessor value: string;

  @property()
  accessor name: string;

  @property()
  accessor inlineStyles: string;

  @property()
  accessor exampleClass: string;

  render() {
    const componentClassNames = classMap({
      'token-specimen': true,
      [this.styleModifier]: !!this.styleModifier,
      'token-specimen--color': this.variant === 'color',
      'token-specimen--animation': this.variant === 'animation',
      'token-specimen--border': this.variant === 'border',
      'token-specimen--opacity': this.variant === 'opacity',
      'token-specimen--shadow': this.variant === 'shadow',
      'token-specimen--typography': this.variant === 'typography'
    });

    return html`
      <tr class=${componentClassNames}>
        ${this.name && html`<td><code>${this.name}</code></td>`} ${this.value && html`<td>${this.value}</td>`}
        ${(this.inlineStyles || this.exampleClass) &&
        html`
          <td class="token-specimen__example">
            <div class="${this.exampleClass}" style=${this.inlineStyles}>
              <slot></slot>
            </div>
          </td>
        `}
      </tr>
    `;
  }
}

if (customElements.get('token-specimen') === undefined) {
  customElements.define('token-specimen', TokenSpecimen);
}

declare global {
  interface HTMLElementTagNameMap {
    'token-specimen': TokenSpecimen;
  }
}
