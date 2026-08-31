import { fixture, html } from '@open-wc/testing-helpers';
import { userEvent } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import './radio';
import type { ALRadio } from './radio';

const inner = (el: ALRadio) => el.shadowRoot!.querySelector('input.al-c-radio__input') as HTMLInputElement;

describe('al-radio', () => {
  it('checks on a real pointer click', async () => {
    // Ported from radio.stories.ts Default.
    const el = await fixture<ALRadio>(html`<al-radio name="size" value="sm">Small</al-radio>`);
    await el.updateComplete;
    expect(inner(el).checked).toBe(false);

    await userEvent.click(inner(el));
    await el.updateComplete;
    expect(el.isChecked).toBe(true);
    expect(inner(el).checked).toBe(true);
  });

  it('never UNchecks itself — a radio only leaves its group', async () => {
    // radio.ts:127 hard-assigns `true`, unlike checkbox.ts:137 which flips.
    // That asymmetry is the point: a lone radio has no "off" state a user can
    // reach, and the owning <al-radio-group> is what clears the previous one.
    // The story clicked once and then pressed Enter, asserting `true` both
    // times, which reads as a copy-paste until you know this is deliberate.
    const el = await fixture<ALRadio>(html`<al-radio name="size" value="sm">Small</al-radio>`);
    await el.updateComplete;

    await userEvent.click(inner(el));
    await el.updateComplete;
    expect(el.isChecked).toBe(true);

    await userEvent.click(inner(el));
    await el.updateComplete;
    expect(el.isChecked, 'clicking a checked radio must leave it checked').toBe(true);
  });

  it('checks on Enter, and fires nothing when it is already checked', async () => {
    // radio.ts:153-157 gates on `!this.isChecked`, so a second Enter must be a
    // no-op rather than a duplicate onRadioChange — the group listens to that
    // event and would re-run its bookkeeping for a state that did not change.
    const el = await fixture<ALRadio>(html`<al-radio name="size" value="sm">Small</al-radio>`);
    await el.updateComplete;
    const seen: unknown[] = [];
    el.addEventListener('onRadioChange', (e) => seen.push((e as CustomEvent).detail));

    inner(el).focus();
    await userEvent.keyboard('{Enter}');
    await el.updateComplete;
    expect(el.isChecked).toBe(true);
    expect(seen).toEqual([{ checked: true, name: 'size', value: 'sm' }]);

    await userEvent.keyboard('{Enter}');
    await el.updateComplete;
    expect(seen).toHaveLength(1);
  });

  it('associates the label with the input through a generated, unique id', async () => {
    const a = await fixture<ALRadio>(html`<al-radio name="size">Small</al-radio>`);
    const b = await fixture<ALRadio>(html`<al-radio name="size">Large</al-radio>`);
    await a.updateComplete;
    await b.updateComplete;
    const label = a.shadowRoot!.querySelector('label') as HTMLLabelElement;

    expect(inner(a).id).toBeTruthy();
    expect(label.htmlFor).toBe(inner(a).id);
    expect(inner(a).id).not.toBe(inner(b).id);
  });

  it('does not change when disabled', async () => {
    const el = await fixture<ALRadio>(html`<al-radio name="size" isDisabled>Small</al-radio>`);
    await el.updateComplete;
    expect(inner(el).disabled).toBe(true);

    let fired = 0;
    el.addEventListener('onRadioChange', () => fired++);
    inner(el).click();
    await el.updateComplete;
    expect(fired).toBe(0);
    expect(el.isChecked).toBeFalsy();
  });

  it('honours an explicit fieldId instead of generating one', async () => {
    const el = await fixture<ALRadio>(html`<al-radio fieldId="plan-pro">Pro</al-radio>`);
    await el.updateComplete;
    expect(inner(el).id).toBe('plan-pro');
    expect((el.shadowRoot!.querySelector('label') as HTMLLabelElement).htmlFor).toBe('plan-pro');
  });

  it('gets no native mutual exclusion from a shared name — the group is load-bearing', async () => {
    // Each <al-radio> renders its <input type="radio"> inside its OWN shadow
    // root, so the platform's one-per-name rule never applies across two
    // elements: both stay checked. This is the concrete reason al-radio-group
    // survives as a component instead of being <al-layout> with props.
    const host = await fixture<HTMLElement>(html`
      <div>
        <al-radio name="plan" value="basic">Basic</al-radio>
        <al-radio name="plan" value="pro">Pro</al-radio>
      </div>
    `);
    const [basic, pro] = [...host.querySelectorAll('al-radio')] as ALRadio[];
    await basic.updateComplete;
    await pro.updateComplete;

    await userEvent.click(inner(basic));
    await userEvent.click(inner(pro));
    await basic.updateComplete;
    await pro.updateComplete;

    expect(pro.isChecked).toBe(true);
    expect(basic.isChecked, 'current behavior — nothing unchecks it outside a group').toBe(true);
  });

  it('marks the field required on the real input, not only visually', async () => {
    const el = await fixture<ALRadio>(html`<al-radio name="plan" isRequired>Pro</al-radio>`);
    await el.updateComplete;
    expect(inner(el).required).toBe(true);
    expect(inner(el).checkValidity()).toBe(false);
  });

  it('describes the input with the field note via aria-describedby', async () => {
    const el = await fixture<ALRadio>(html`<al-radio name="plan" fieldNote="Billed yearly.">Pro</al-radio>`);
    await el.updateComplete;

    const describedBy = inner(el).getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const note = el.shadowRoot!.querySelector(`[id="${describedBy}"]`);
    expect(note, 'aria-describedby must point at a node that exists').not.toBeNull();
    expect(note!.textContent!.trim()).toBe('Billed yearly.');
  });
});
