import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import './list-item';
import type { ALListItem } from './list-item';

const link = (el: ALListItem) =>
  el.shadowRoot!.querySelector('.al-c-list-item__link') as HTMLElement;

describe('al-list-item', () => {
  it('does not render an invalid tabindex on an enabled item', async () => {
    /*
     * `tabindex=${this.isDisabled && '-1'}` was the binding. When `isDisabled`
     * is falsy the expression is `false`, and Lit renders a plain attribute
     * binding as `String(value)` — so an ENABLED item shipped
     * `tabindex="false"`, which is not a valid integer.
     *
     * The intent was clearly "-1 when disabled, nothing otherwise", which is
     * what `ifDefined` expresses. This asserts the attribute is absent rather
     * than asserting a specific `tabIndex` number, because how a browser
     * coerces an invalid value is exactly the implementation detail that should
     * not be relied on.
     */
    const el = await fixture<ALListItem>(html`<al-list-item variant="static">Item</al-list-item>`);
    await el.updateComplete;

    expect(link(el).hasAttribute('tabindex'), 'an enabled item declares no tabindex').toBe(false);
  });

  it('takes itself out of the tab order when disabled', async () => {
    const el = await fixture<ALListItem>(
      html`<al-list-item variant="static" isDisabled>Item</al-list-item>`
    );
    await el.updateComplete;

    expect(link(el).getAttribute('tabindex')).toBe('-1');
  });

  it('does not render an invalid tabindex on an enabled href item either', async () => {
    // Same binding, second call site (the `href` branch).
    const el = await fixture<ALListItem>(
      html`<al-list-item href="/somewhere">Item</al-list-item>`
    );
    await el.updateComplete;

    const anchor = el.shadowRoot!.querySelector('a.al-c-list-item__link') as HTMLElement;
    expect(anchor.hasAttribute('tabindex'), 'an enabled anchor declares no tabindex').toBe(false);
  });
});
