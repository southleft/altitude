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

  it('an invalid tabindex was never focusable anyway, so removing it changed no behavior', async () => {
    // Worth pinning, because the fix LOOKS like it could have removed a tab
    // stop. Measured: `tabindex="false"` yields `tabIndex === -1` and is not
    // focusable — identical to declaring nothing. The fix deleted an invalid
    // attribute from the DOM and nothing else.
    const host = await fixture<HTMLElement>(html`<div></div>`);
    const probe = document.createElement('div');
    probe.setAttribute('tabindex', 'false');
    host.append(probe);

    expect(probe.tabIndex, 'an invalid value parses as -1').toBe(-1);
    probe.focus();
    expect(document.activeElement === probe, 'and is not focusable').toBe(false);
  });

  /** Resolve a token to the computed colour a real element would get. */
  const resolveColor = async (prop: 'color' | 'backgroundColor', token: string) => {
    const host = await fixture<HTMLElement>(html`<div></div>`);
    const probe = document.createElement('span');
    probe.style[prop] = `var(${token})`;
    host.append(probe);
    return getComputedStyle(probe)[prop];
  };

  it('pairs the primary background of a current item with the on-primary text colour', async () => {
    // The current item is filled with background-primary-default but used to
    // keep `color: inherit`, i.e. dark text on the brand blue. al-button
    // primary pairs the same fill with content-primary-weak; so must this.
    const expectedBg = await resolveColor('backgroundColor', '--al-theme-color-background-primary-default');
    const expectedFg = await resolveColor('color', '--al-theme-color-content-primary-weak');

    for (const tpl of [
      html`<al-list-item isCurrent>Item</al-list-item>`,
      html`<al-list-item isCurrent href="/here">Item</al-list-item>`,
      html`<al-list-item isCurrent variant="static">Item</al-list-item>`
    ]) {
      const el = await fixture<ALListItem>(tpl);
      await el.updateComplete;
      const cs = getComputedStyle(link(el));
      expect(cs.backgroundColor).toBe(expectedBg);
      expect(cs.color).toBe(expectedFg);
    }
  });

  it('leaves a non-current item on the inherited text colour', async () => {
    const el = await fixture<ALListItem>(html`<al-list-item>Item</al-list-item>`);
    await el.updateComplete;
    expect(getComputedStyle(link(el)).color).toBe(getComputedStyle(el.parentElement!).color);
  });

  it('keeps the --al-list-item-link-hover-background hook overriding the current fill', async () => {
    const el = await fixture<ALListItem>(
      html`<al-list-item isCurrent style="--al-list-item-link-hover-background: rgb(1, 2, 3)">Item</al-list-item>`
    );
    await el.updateComplete;
    expect(getComputedStyle(link(el)).backgroundColor).toBe('rgb(1, 2, 3)');
  });

  it('marks the rendered link aria-current="page" when isCurrent is set with an href', async () => {
    const el = await fixture<ALListItem>(html`<al-list-item isCurrent href="/here">Item</al-list-item>`);
    await el.updateComplete;
    const anchor = el.shadowRoot!.querySelector('a.al-c-list-item__link')!;
    expect(anchor.getAttribute('aria-current')).toBe('page');

    el.isCurrent = false;
    await el.updateComplete;
    expect(anchor.hasAttribute('aria-current'), 'removed when no longer current').toBe(false);
  });
});
