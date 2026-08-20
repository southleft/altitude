import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../ALElement';
import styles from './testimonial.scss';

/**
 * Component: al-testimonial
 *
 * A single customer quote with attribution — for marketing pages (social
 * proof rows, case-study pull-quotes). Composes `<al-avatar>` via the
 * `avatar` slot for a headshot.
 *
 * @slot - The quote text.
 * @slot avatar - Optional avatar (typically an `<al-avatar>`).
 */
export class ALTestimonial extends ALElement {
  static el = 'al-testimonial';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * The name of the person being quoted.
   */
  @property()
  accessor attribution: string;

  /**
   * Job title of the person being quoted, e.g. "VP of Engineering".
   */
  @property()
  accessor role: string;

  /**
   * Company/organization of the person being quoted.
   */
  @property()
  accessor company: string;

  private get roleAndCompany(): string {
    return [this.role, this.company].filter(Boolean).join(', ');
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-testimonial');
    const roleAndCompany = this.roleAndCompany;

    return html`
      <figure class="${componentClassNames}">
        <blockquote class="al-c-testimonial__quote">
          <slot></slot>
        </blockquote>
        ${this.attribution || roleAndCompany || this.slotNotEmpty('avatar')
          ? html`
              <figcaption class="al-c-testimonial__attribution">
                ${this.slotNotEmpty('avatar')
                  ? html`
                      <div class="al-c-testimonial__avatar">
                        <slot name="avatar"></slot>
                      </div>
                    `
                  : ''}
                <div class="al-c-testimonial__meta">
                  ${this.attribution ? html`<span class="al-c-testimonial__name">${this.attribution}</span>` : ''}
                  ${roleAndCompany ? html`<span class="al-c-testimonial__role">${roleAndCompany}</span>` : ''}
                </div>
              </figcaption>
            `
          : ''}
      </figure>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALTestimonial.el) === undefined) {
  customElements.define(ALTestimonial.el, ALTestimonial);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-testimonial': ALTestimonial;
  }
}
