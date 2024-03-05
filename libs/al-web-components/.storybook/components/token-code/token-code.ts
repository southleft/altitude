import { LitElement, html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import styles from './token-code.scss';
import '../../../components/icon/icons/copy';
import '../../../components/icon/icons/check';

export class TokenCode extends LitElement {
  static get styles() {
    return unsafeCSS(styles.toString());
  }

  @property()
  accessor styleModifier: string;

  @property()
  accessor value: string;

  @property({ type: Boolean })
  accessor disableCopy: boolean;

  /**
   * Handle on click
   * 1. Create a temporary textarea element to copy the text
   * 2. Select the text within the textarea
   * 3. Remove the temporary textarea
   * 4. Add a class if the text is copied
   * 5. Remove the class after one second
   */
  handleOnClick() {
    const button = this.shadowRoot?.querySelector('button') as HTMLButtonElement;
    const codeEl = this.shadowRoot?.querySelector('span') as HTMLElement;
    const codeElValue = codeEl.innerText;

    /* 1 */
    const textarea = document.createElement('textarea');
    textarea.value = codeElValue;
    document.body.appendChild(textarea);

    /* 2 */
    textarea.select();
    document.execCommand('copy');

    /* 3 */
    document.body.removeChild(textarea);

    /* 4 */
    button.classList.add('is-copied');

    /* 5 */
    setTimeout(() => {
      button.classList.remove('is-copied');
    }, 1000);
  }

  render() {
    const componentClassNames = classMap({
      'token-code': true,
      [this.styleModifier]: !!this.styleModifier,
      'has-disable-copy': this.disableCopy
    });

    return html`
      <code class=${componentClassNames}>
        <span class="token-code__code">${this.value}</span>
        ${!this.disableCopy ? html `
          <button class="token-code__button" title="Copy to Clipboard" @click=${this.handleOnClick}>
            <al-icon-copy class="token-code__icon-copy" size="sm"></al-icon-copy>
            <al-icon-check class="token-code__icon-check" size="sm"></al-icon-check>
          </button>
        `: html``}
      </code>
    `;
  }
}

if (customElements.get('token-code') === undefined) {
  customElements.define('token-code', TokenCode);
}

declare global {
  interface HTMLElementTagNameMap {
    'token-code': TokenCode;
  }
}
