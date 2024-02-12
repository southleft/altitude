import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { SLElement } from '../SLElement';
import styles from './spinner.scss';

/**
 * Component: el-spinner
 *
 * Spinner is used when retrieving data or performing slow computations, to notify users that their action is being processed.
 */
export class SLSpinner extends SLElement {
  static el = 'sl-spinner';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Inverted variant
   * 1) Used for dark backgrounds
   */
  @property({ type: Boolean })
  accessor inverted: boolean;

  /**
   * Small loader
   */
  @property({ type: Boolean })
  accessor small = false;

  render() {
    const componentClassNames = this.componentClassNames('sl-c-spinner', {
      'sl-c-spinner--small': this.small === true,
      'sl-c-spinner--inverted': this.inverted === true
    });

    return html`
      <div class="${componentClassNames}" role="status" aria-label="Loading" aria-atomic="true" aria-live="polite" aria-busy="true">
        <?xml version="1.0" encoding="UTF-8"?><svg id="a" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path
            class="sl-c-spinner__path--8"
            d="M11.392,5.4988V0c-2.8598,.1429-5.4556,1.2851-7.4465,3.0851l3.8864,3.8869c.9845-.8171,2.2134-1.3484,3.5601-1.4733Z"
          />
          <path
            class="sl-c-spinner__path--7"
            d="M6.9719,7.832L3.0856,3.9451C1.2856,5.936,.1423,8.5318,0,11.3922H5.4992c.1244-1.3468,.6556-2.5757,1.4727-3.5602Z"
          />
          <path
            class="sl-c-spinner__path--6"
            d="M5.4991,12.6084H-.0002c.1429,2.8593,1.2856,5.4556,3.0856,7.4465l3.8869-3.8869c-.8171-.984-1.3489-2.2129-1.4733-3.5596h.0001Z"
          />
          <path
            class="sl-c-spinner__path--5"
            d="M7.8319,17.028l-3.8864,3.8869c1.9904,1.8,4.5867,2.9427,7.4465,3.0851v-5.4988c-1.3472-.1243-2.5756-.6562-3.5601-1.4732Z"
          />
          <path
            class="sl-c-spinner__path--4"
            d="M12.6081,18.5013v5.4988c2.8598-.1429,5.4556-1.2851,7.4471-3.0851l-3.8869-3.8869c-.9846,.8171-2.2135,1.3483-3.5602,1.4732Z"
          />
          <path
            class="sl-c-spinner__path--3"
            d="M18.501,12.6084c-.1243,1.3467-.6561,2.5756-1.4732,3.5596l3.8869,3.8869c1.8-1.9909,2.9427-4.5872,3.0856-7.4465h-5.4993Z"
          />
          <path
            class="sl-c-spinner__path--2"
            d="M18.501,11.3923h5.4993c-.1429-2.8598-1.2851-5.4562-3.0856-7.4471l-3.8869,3.8869c.8171,.984,1.3489,2.2129,1.4732,3.5602Z"
          />
          <path
            class="sl-c-spinner__path--1"
            d="M16.1682,6.9722l3.8863-3.8869C18.0642,1.2853,15.4678,.1426,12.608,.0002V5.499c1.3472,.1244,2.5756,.6562,3.5602,1.4733h0Z"
          />
        </svg>
      </div>
    `;
  }
}

if ((globalThis as any).slAutoRegistry === true && customElements.get(SLSpinner.el) === undefined) {
  customElements.define(SLSpinner.el, SLSpinner);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-spinner': SLSpinner;
  }
}
