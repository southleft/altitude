// T2.1 spike copy of button.ts — identical except for the SCSS import form.
// Used to prove Vite's `?inline` query produces a string-shaped CSS that
// `unsafeCSS` can adopt without any other code change.
//
// Once T2.2 lands and the codemod runs, button.ts itself will switch to the
// `?inline` form and this file is deleted.

import { html, unsafeCSS } from 'lit';
import { property, queryAssignedNodes } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { FormController } from '../../controllers/form';
import { ALElement } from '../ALElement';
import styles from './button.scss?inline';

/**
 * Component: al-button (T2.1 Vite spike)
 */
export class ALButtonViteSpike extends ALElement {
  static el = 'al-button-vite-spike';

  static get styles() {
    return unsafeCSS(styles);
  }

  protected formController = new FormController(this);

  @property() accessor type: 'button' | 'submit' | 'reset' = 'button';
  @property() accessor variant: 'secondary' | 'tertiary' | 'bare' | 'danger';
  @property() accessor target: '_blank' | '_self' | '_parent' | '_top';
  @property() accessor href: string;
  @property() accessor name: string;
  @property() accessor label: string;
  @property() accessor value: string;
  @property() accessor isPressed: boolean | 'mixed';

  @queryAssignedNodes({ slot: 'before' }) accessor beforeSlot: Array<HTMLElement>;

  render() {
    const tag = this.href ? 'a' : 'button';
    return html`
      <${tag === 'a' ? html`a` : html`button`}
        class="al-c-button"
        type="${ifDefined(this.type)}"
        name="${ifDefined(this.name)}"
        value="${ifDefined(this.value)}"
        aria-label="${ifDefined(this.label)}"
        href="${ifDefined(this.href)}"
        target="${ifDefined(this.target)}"
      >
        <span class="al-c-button__text"><slot></slot></span>
      </${tag === 'a' ? html`a` : html`button`}>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALButtonViteSpike.el) === undefined) {
  customElements.define(ALButtonViteSpike.el, ALButtonViteSpike);
}
