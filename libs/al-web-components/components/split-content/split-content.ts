import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../ALElement';
import styles from './split-content.scss';

/**
 * Component: al-split-content
 *
 * A two-column media/content organism for marketing pages — feature call-outs,
 * "why us" sections, alternating benefit rows. Purely compositional, like
 * al-hero: all visual decisions come from theme tokens, and the two columns
 * naturally stack below their combined minimum widths (no fixed breakpoint
 * is hardcoded so the collapse point tracks whatever content is slotted in).
 *
 * @slot media - The media column (image, illustration, embed, or composed cards).
 * @slot content - The content column (heading, copy, actions).
 * @cssproperty --al-split-content-gap - Gap between the media and content columns. Defaults to the theme space ramp.
 */
export class ALSplitContent extends ALElement {
  static el = 'al-split-content';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Media position
   * - **end** (default) Media renders after the content
   * - **start** Media renders before the content
   */
  @property()
  accessor mediaPosition: 'start' | 'end';

  /**
   * Vertical alignment of the two columns relative to one another
   * - **center** (default) Columns are vertically centered
   * - **start** Columns align to the block-start edge
   * - **end** Columns align to the block-end edge
   */
  @property()
  accessor verticalAlignment: 'start' | 'center' | 'end';

  render() {
    const componentClassNames = this.componentClassNames('al-c-split-content', {
      'al-c-split-content--media-start': this.mediaPosition === 'start',
      'al-c-split-content--align-start': this.verticalAlignment === 'start',
      'al-c-split-content--align-end': this.verticalAlignment === 'end'
    });

    return html`
      <div class="${componentClassNames}">
        <div class="al-c-split-content__media">
          <slot name="media"></slot>
        </div>
        <div class="al-c-split-content__content">
          <slot name="content"></slot>
        </div>
      </div>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALSplitContent.el) === undefined) {
  customElements.define(ALSplitContent.el, ALSplitContent);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-split-content': ALSplitContent;
  }
}
