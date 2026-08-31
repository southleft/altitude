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
    // This used to be what floated the label. v2 retired the floating label, so
    // `isActive` is deprecated and styles nothing — but it is still DERIVED, and
    // `.al-is-active` is still emitted, precisely so consumer CSS keyed on that
    // hook does not break silently. This test pins that retention: if someone
    // removes the derivation without removing the property, the hook goes dead
    // with no error. Asserting both directions, because a handler that only ever
    // sets `true` would pass a one-way test.
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

  // ---- v2: the label is top-aligned and static (spec 2026-08-30) ----------

  it('renders the label OUTSIDE the field container, above it', async () => {
    // The floating label lived inside `.al-c-input__container` so it could be
    // absolutely positioned against the field. v2 lifts it out: `__before` /
    // `__after` are centred against that container, so a label inside it would
    // drag slotted icons off-centre.
    const el = await fixture<ALInput>(html`<al-input label="Email"></al-input>`);
    const label = el.shadowRoot!.querySelector('.al-c-input__label')!;
    const container = el.shadowRoot!.querySelector('.al-c-input__container')!;

    expect(container.contains(label)).toBe(false);
    expect(label.parentElement!.classList.contains('al-c-input')).toBe(true);
    // and it precedes the field in DOM order
    expect(label.compareDocumentPosition(container) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps the label in the accessibility tree when hideLabel is set', async () => {
    // hideLabel must hide VISUALLY only. `display:none` / `visibility:hidden` /
    // the `hidden` attribute would each strip the field's accessible name.
    const el = await fixture<ALInput>(html`<al-input label="Email" hideLabel></al-input>`);
    const label = el.shadowRoot!.querySelector('label') as HTMLLabelElement;
    const cs = getComputedStyle(label);

    expect(label.htmlFor).toBe(inner(el).id);
    expect(label.textContent!.trim()).toContain('Email');
    expect(cs.display).not.toBe('none');
    expect(cs.visibility).not.toBe('hidden');
    expect(label.hasAttribute('hidden')).toBe(false);
    // clipped to a 1px box rather than removed
    expect(cs.position).toBe('absolute');
  });

  it('shows the placeholder regardless of hideLabel', async () => {
    // Before v2 the placeholder was hidden by default and only revealed under
    // `.al-has-hidden-label`, because the floating label sat in its position.
    // That coupling is gone; a placeholder shows whenever it is set.
    for (const hide of [false, true]) {
      const el = await fixture<ALInput>(
        hide
          ? html`<al-input label="Email" placeholder="you@example.com" hideLabel></al-input>`
          : html`<al-input label="Email" placeholder="you@example.com"></al-input>`
      );
      const ph = getComputedStyle(inner(el), '::placeholder');
      expect(inner(el).placeholder).toBe('you@example.com');
      expect(ph.opacity).not.toBe('0');
      expect(ph.visibility).not.toBe('hidden');
    }
  });

  it('places the label inside the field container for labelPosition="inset"', async () => {
    // The inset variant is the v2 replacement for the floating label: same
    // position, but STATIC — it must be inside the container to be positioned
    // against the field box, and must not move between states.
    const el = await fixture<ALInput>(
      html`<al-input label="Company" labelPosition="inset"></al-input>`
    );
    const label = el.shadowRoot!.querySelector('.al-c-input__label')!;
    const container = el.shadowRoot!.querySelector('.al-c-input__container')!;

    expect(container.contains(label)).toBe(true);
    expect(el.shadowRoot!.querySelector('.al-c-input')!.className).toContain('al-has-inset-label');

    const before = label.getBoundingClientRect();
    inner(el).focus();
    await el.updateComplete;
    const after = label.getBoundingClientRect();
    expect(after.top).toBeCloseTo(before.top, 1);
    expect(after.left).toBeCloseTo(before.left, 1);
  });
});
