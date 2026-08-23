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
   *
   * The attribute is `attribution-role`, **not** `role`. `role` is the ARIA
   * role attribute: `<al-testimonial role="VP of Engineering">` put a job title
   * where the accessibility tree expects a role name, and axe reported
   * `aria-roles` ("role attribute must use a valid value") on every
   * Testimonial story. `apps/southleft` had already worked around it by
   * writing the *property* from a `data-testimonial-role` attribute.
   */
  @property({ attribute: 'attribution-role' })
  accessor attributionRole: string;

  /**
   * @deprecated Use `attributionRole`. Kept because consumers (including
   * `apps/southleft`) assign the `role` **property** as a workaround for the
   * attribute collision described above; this keeps that working while never
   * writing an invalid ARIA `role` attribute.
   */
  get role(): string {
    return this.attributionRole;
  }

  set role(value: string) {
    this.attributionRole = value;
  }

  /**
   * Company/organization of the person being quoted.
   */
  @property()
  accessor company: string;

  private get roleAndCompany(): string {
    return [this.attributionRole, this.company].filter(Boolean).join(', ');
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
