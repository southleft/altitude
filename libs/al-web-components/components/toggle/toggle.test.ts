import { fixture, html } from '@open-wc/testing-helpers';
import { userEvent } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import './toggle';
import type { ALToggle } from './toggle';

const inner = (el: ALToggle) => el.shadowRoot!.querySelector('input.al-c-toggle__checkbox') as HTMLInputElement;
const box = (el: ALToggle) => el.shadowRoot!.querySelector('.al-c-toggle') as HTMLElement;
// The <input> is visually collapsed underneath the styled <label>, which is the
// thing a real pointer can actually hit. Clicking the input directly makes
// Playwright fail with "label intercepts pointer events" — and a test that
// worked around that with `.click()` would stop proving the switch is clickable.
const switchTarget = (el: ALToggle) => el.shadowRoot!.querySelector('label.al-c-toggle__label') as HTMLElement;

describe('al-toggle', () => {
  it('checks on Enter, which a native checkbox ignores', async () => {
    // Ported from toggle.stories.ts Default. toggle.ts:89-93 — Enter does not
    // produce a native `change` on a checkbox, so this handler is the whole
    // reason the keyboard path works.
    const el = await fixture<ALToggle>(html`<al-toggle label="Notifications"></al-toggle>`);
    await el.updateComplete;
    inner(el).focus();

    await userEvent.keyboard('{Enter}');
    await el.updateComplete;
    expect(el.isChecked).toBe(true);
    expect(inner(el).checked).toBe(true);
    expect(box(el).className).toContain('al-is-checked');
  });

  it('toggles in both directions on a real pointer click', async () => {
    const el = await fixture<ALToggle>(html`<al-toggle label="Notifications"></al-toggle>`);
    await el.updateComplete;

    await userEvent.click(switchTarget(el));
    await el.updateComplete;
    expect(el.isChecked).toBe(true);

    await userEvent.click(switchTarget(el));
    await el.updateComplete;
    expect(el.isChecked).toBe(false);
    expect(box(el).className).not.toContain('al-is-checked');
  });

  it('reports the new state through onToggleChange', async () => {
    const el = await fixture<ALToggle>(html`<al-toggle label="Notifications"></al-toggle>`);
    await el.updateComplete;
    const seen: unknown[] = [];
    el.addEventListener('onToggleChange', (e) => seen.push((e as CustomEvent).detail.checked));

    await userEvent.click(switchTarget(el));
    await userEvent.click(switchTarget(el));
    await el.updateComplete;
    expect(seen).toEqual([true, false]);
  });

  it('associates the visible label with the input through a generated, unique id', async () => {
    // toggle.ts:63 — the label text is the only accessible name this control
    // has; if the for/id pair breaks it announces as an unlabelled checkbox.
    const a = await fixture<ALToggle>(html`<al-toggle label="Wi-Fi"></al-toggle>`);
    const b = await fixture<ALToggle>(html`<al-toggle label="Bluetooth"></al-toggle>`);
    await a.updateComplete;
    await b.updateComplete;
    const label = a.shadowRoot!.querySelector('label') as HTMLLabelElement;

    expect(inner(a).id).toBeTruthy();
    expect(label.htmlFor).toBe(inner(a).id);
    expect(label.textContent!.trim()).toBe('Wi-Fi');
    expect(inner(a).id).not.toBe(inner(b).id);
  });

  it('does not change when disabled', async () => {
    const el = await fixture<ALToggle>(html`<al-toggle label="Wi-Fi" isDisabled></al-toggle>`);
    await el.updateComplete;
    expect(inner(el).disabled).toBe(true);
    expect(box(el).className).toContain('al-is-disabled');

    let fired = 0;
    el.addEventListener('onToggleChange', () => fired++);
    inner(el).click();
    await el.updateComplete;
    expect(fired).toBe(0);
    expect(el.isChecked).toBeFalsy();
  });

  it('keeps the native input in step with isChecked, even after a user click', async () => {
    // toggle.ts used `?checked=` — the boolean ATTRIBUTE — where checkbox.ts
    // uses the property. The content attribute only seeds initial state: a
    // click sets the input's dirty-checkedness flag and the attribute stops
    // driving `.checked` from then on. So a consumer resetting `isChecked`
    // after a failed save or a cancelled dialog was left with a switch whose
    // native state disagreed with the component's own. Fixed 2026-08-24 by
    // binding `.checked`.
    //
    // The click in the middle is the whole point — before it, the old binding
    // passed this test too.
    const el = await fixture<ALToggle>(html`<al-toggle label="Wi-Fi"></al-toggle>`);
    await el.updateComplete;

    el.isChecked = true;
    await el.updateComplete;
    expect(inner(el).checked).toBe(true);
    el.isChecked = false;
    await el.updateComplete;
    expect(inner(el).checked).toBe(false);

    await userEvent.click(switchTarget(el));
    await el.updateComplete;
    expect(el.isChecked).toBe(true);
    expect(inner(el).checked).toBe(true);

    el.isChecked = false;
    await el.updateComplete;
    expect(box(el).className, 'the CSS treatment follows the property').not.toContain('al-is-checked');
    expect(inner(el).checked, 'and so does the native input, post-click').toBe(false);
  });

  it('contributes nothing to the owning form', async () => {
    // FINDING, documented not endorsed. al-toggle renders a `name` attribute
    // (toggle.ts:107) but declares no `formAssociated`/ElementInternals, and
    // its <input> is inside the shadow root — so the switch is invisible to
    // FormData, form.reset() and constraint validation. Only al-input
    // (input.ts:262 -> controllers/form-associated.ts) actually participates.
    const form = await fixture<HTMLFormElement>(html`
      <form><al-toggle name="notify" label="Notifications"></al-toggle></form>
    `);
    const el = form.querySelector('al-toggle') as ALToggle;
    await el.updateComplete;

    await userEvent.click(switchTarget(el));
    await el.updateComplete;

    expect(el.isChecked).toBe(true);
    expect((el.constructor as any).formAssociated).toBeFalsy();
    expect(new FormData(form).get('notify'), 'current behavior — not form-associated').toBeNull();
  });
});
