import { fixture, html } from '@open-wc/testing-helpers';
import { userEvent } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import './input';
import type { ALInput } from './input';

const inner = (el: ALInput) => el.shadowRoot!.querySelector('input.al-c-input__input') as HTMLInputElement;

describe('al-input', () => {
  it('associates the label with the input through a generated id', async () => {
    // input.ts:206-212 — fieldId falls back to nanoid() so the for/id pair is
    // never empty. Two instances must not collide.
    const a = await fixture<ALInput>(html`<al-input label="Email"></al-input>`);
    const b = await fixture<ALInput>(html`<al-input label="Name"></al-input>`);
    const labelA = a.shadowRoot!.querySelector('label') as HTMLLabelElement;

    expect(inner(a).id).toBeTruthy();
    expect(labelA.htmlFor).toBe(inner(a).id);
    expect(inner(a).id).not.toBe(inner(b).id);
  });

  it('honours an explicit fieldId instead of generating one', async () => {
    const el = await fixture<ALInput>(html`<al-input fieldId="my-field"></al-input>`);
    expect(inner(el).id).toBe('my-field');
    expect((el.shadowRoot!.querySelector('label') as HTMLLabelElement).htmlFor).toBe('my-field');
  });

  it('emits onInputChange with the new value when the user types', async () => {
    const el = await fixture<ALInput>(html`<al-input label="Email"></al-input>`);
    const seen: unknown[] = [];
    el.addEventListener('onInputChange', (e) => seen.push((e as CustomEvent).detail.value));

    await userEvent.fill(inner(el), 'hello');
    await el.updateComplete;

    expect(seen.at(-1)).toBe('hello');
    expect(el.value).toBe('hello');
  });

  it('sets isActive only while the field has content', async () => {
    // input.ts:255-259 — this is what floats the label. Asserting both
    // directions, because a handler that only ever sets `true` would pass a
    // one-way test.
    const el = await fixture<ALInput>(html`<al-input label="Email"></al-input>`);
    expect(el.isActive).toBeFalsy();

    await userEvent.fill(inner(el), 'x');
    await el.updateComplete;
    expect(el.isActive).toBe(true);
    expect(el.shadowRoot!.querySelector('.al-c-input')!.className).toContain('al-is-active');

    await userEvent.clear(inner(el));
    await el.updateComplete;
    expect(el.isActive).toBe(false);
    expect(el.shadowRoot!.querySelector('.al-c-input')!.className).not.toContain('al-is-active');
  });

  it('carries the typed value into the owning form as FormData', async () => {
    // input.ts:262 -> controllers/form-associated.ts:55. The existing Playwright
    // spec (tests/form-internals.spec.ts:26) calls setValue() by hand, which
    // proves the controller works but NOT that the component ever calls it.
    // Typing is the difference.
    const form = await fixture<HTMLFormElement>(html`
      <form><al-input name="email" label="Email"></al-input></form>
    `);
    const el = form.querySelector('al-input') as ALInput;
    await userEvent.fill(inner(el), 'hi@example.com');
    await el.updateComplete;

    expect(new FormData(form).get('email')).toBe('hi@example.com');
  });

  it('counts characters against maxLength as the user types', async () => {
    const el = await fixture<ALInput>(html`<al-input label="Bio" maxLength="10"></al-input>`);
    await userEvent.fill(inner(el), 'abcd');
    await el.updateComplete;
    expect(el.maxLengthValue).toBe(4);
    expect(el.shadowRoot!.querySelector('.al-c-input__footer')!.textContent).toContain('4/10');
  });

  it('describes the input with the field note via aria-describedby', async () => {
    const el = await fixture<ALInput>(html`<al-input label="Email" fieldNote="We never share it."></al-input>`);
    const describedBy = inner(el).getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const note = el.shadowRoot!.querySelector(`[id="${describedBy}"]`);
    expect(note, 'aria-describedby must point at a node that exists').not.toBeNull();
    expect(note!.textContent!.trim()).toBe('We never share it.');
  });

  it('marks the field required on the real input, not only visually', async () => {
    const el = await fixture<ALInput>(html`<al-input label="Email" isRequired></al-input>`);
    expect(inner(el).required).toBe(true);
    expect(inner(el).checkValidity()).toBe(false);
    expect(el.shadowRoot!.querySelector('.al-c-input__asterisk')).not.toBeNull();
  });

  it('forces autocomplete off for password inputs', async () => {
    // input.ts:296 — a password field must never inherit the caller's
    // autoComplete value.
    const pw = await fixture<ALInput>(html`<al-input type="password" autoComplete="on"></al-input>`);
    expect(inner(pw).getAttribute('autocomplete')).toBe('off');

    const text = await fixture<ALInput>(html`<al-input type="text" autoComplete="on"></al-input>`);
    expect(inner(text).getAttribute('autocomplete')).toBe('on');
  });

  it('reflects the disabled and readonly states onto the native input', async () => {
    const el = await fixture<ALInput>(html`<al-input isDisabled isReadonly></al-input>`);
    expect(inner(el).disabled).toBe(true);
    expect(inner(el).readOnly).toBe(true);
    expect(el.shadowRoot!.querySelector('.al-c-input')!.className).toContain('al-is-disabled');
  });
});
