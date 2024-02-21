import { LitElement, html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import styles from './token-specimen.scss';
import '../../../components/icon/icons/copy';
import '../../../components/icon/icons/check';
import '../token-code/token-code';

export class TokenSpecimen extends LitElement {
  static get styles() {
    return unsafeCSS(styles.toString());
  }

  @property()
  accessor styleModifier: string;

  @property()
  accessor variant: 'color' | 'icon' | 'animation' | 'border' | 'opacity' | 'shadow' | 'space' | 'typography';

  @property()
  accessor value: string;

  @property()
  accessor name: string;

  @property()
  accessor codeUnicode: string;

  @property()
  accessor codeHtml: string;

  @property()
  accessor inlineStyles: string;

  @property()
  accessor exampleClass: string;

  @property({ type: Boolean })
  accessor disableCopy: boolean;

  async importTokenCode() {
    await import('../token-code/token-code.ts'); // Import TokenCode component dynamically
  }

  render() {
    const componentClassNames = classMap({
      'token-specimen': true,
      [this.styleModifier]: !!this.styleModifier,
      'token-specimen--animation': this.variant === 'animation',
      'token-specimen--border': this.variant === 'border',
      'token-specimen--color': this.variant === 'color',
      'token-specimen--icon': this.variant === 'icon',
      'token-specimen--opacity': this.variant === 'opacity',
      'token-specimen--shadow': this.variant === 'shadow',
      'token-specimen--space': this.variant === 'space',
      'token-specimen--typography': this.variant === 'typography'
    });

    // Lazy load TokenCode component
    this.importTokenCode();

    return html`
      <tr class=${componentClassNames}>
        ${this.name && html`
          <td>
            <token-code value="${this.name}" ?disableCopy=${this.disableCopy}></token-code>
          </td>
        `}
        ${this.codeUnicode && html`
          <td>
            <token-code value="${this.codeUnicode}" ?disableCopy=${this.disableCopy}></token-code>
          </td>
        `}
        ${this.codeHtml && html`
          <td>
            <token-code value="${this.codeHtml}" ?disableCopy=${this.disableCopy}></token-code>
          </td>
        `}
        ${this.value && html`<td>${this.value}</td>`}
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
