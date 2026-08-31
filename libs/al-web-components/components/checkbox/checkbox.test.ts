import { fixture, html } from '@open-wc/testing-helpers';
import { userEvent } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import './checkbox';
import type { ALCheckbox } from './checkbox';

const inner = (el: ALCheckbox) => el.shadowRoot!.querySelector('input.al-c-checkbox__input') as HTMLInputElement;
const box = (el: ALCheckbox) => el.shadowRoot!.querySelector('.al-c-checkbox') as HTMLElement;

describe('al-checkbox', () => {
  it('toggles isChecked on a real pointer click, in both directions', async () => {
    // Ported from checkbox.stories.ts Checked. The story started from
    // `isChecked` and clicked once, so it only ever proved true -> false; a
    // handler that hard-assigned `false` would have passed it.
    const el = await fixture<ALCheckbox>(html`<al-checkbox isChecked>Subscribe</al-checkbox>`);
    await el.updateComplete;
    expect(inner(el).checked).toBe(true);

    await userEvent.click(inner(el));
    await el.updateComplete;
    expect(el.isChecked).toBe(false);
    expect(inner(el).checked).toBe(false);

    await userEvent.click(inner(el));
    await el.updateComplete;
    expect(el.isChecked).toBe(true);
    expect(inner(el).checked).toBe(true);
  });

  it('toggles on Enter, which a native checkbox ignores', async () => {
    // checkbox.ts:157-161. A native <input type=checkbox> fires `change` for
    // Space but does NOTHING for Enter, so this keydown handler is the only
    // thing making Enter work — and the only thing a test can catch regressing.
    const el = await fixture<ALCheckbox>(html`<al-checkbox>Subscribe</al-checkbox>`);
    await el.updateComplete;
    inner(el).focus();

    await userEvent.keyboard('{Enter}');
    await el.updateComplete;
    expect(el.isChecked).toBe(true);
    expect(inner(el).checked).toBe(true);
  });

  it('ignores keys other than Enter', async () => {
    const el = await fixture<ALCheckbox>(html`<al-checkbox>Subscribe</al-checkbox>`);
    await el.updateComplete;
    inner(el).focus();

    await userEvent.keyboard('{Escape}');
    await el.updateComplete;
    expect(el.isChecked).toBeFalsy();
  });

  it('clears the indeterminate state on the first interaction and never returns to it on its own', async () => {
    // Ported from checkbox.stories.ts Indeterminate. checkbox.ts:138-141 —
    // indeterminate is a transient "some children checked" display state; once
    // the user commits a decision it must not come back without the consumer
    // asking for it.
    const el = await fixture<ALCheckbox>(html`<al-checkbox isIndeterminate>All</al-checkbox>`);
    await el.updateComplete;
    expect(box(el).className).toContain('al-is-indeterminate');

    await userEvent.click(inner(el));
    await el.updateComplete;
    expect(el.isIndeterminate).toBe(false);
    expect(box(el).className).not.toContain('al-is-indeterminate');

    await userEvent.click(inner(el));
    await el.updateComplete;
    expect(el.isIndeterminate).toBe(false);
  });

  it('reports checked, indeterminate and value together in onCheckboxChange', async () => {
    // All three travel in one detail object — a consumer driving a
    // "select all" parent needs `indeterminate` from the same event that
    // told it `checked` changed, not a second read of the property.
    const el = await fixture<ALCheckbox>(html`<al-checkbox isIndeterminate value="all">All</al-checkbox>`);
    await el.updateComplete;
    const seen: unknown[] = [];
    el.addEventListener('onCheckboxChange', (e) => seen.push((e as CustomEvent).detail));

    await userEvent.click(inner(el));
    await el.updateComplete;
    expect(seen).toEqual([{ checked: true, indeterminate: false, value: 'all' }]);
  });

  it('associates the label with the input through a generated, unique id', async () => {
    const a = await fixture<ALCheckbox>(html`<al-checkbox>A</al-checkbox>`);
    const b = await fixture<ALCheckbox>(html`<al-checkbox>B</al-checkbox>`);
    await a.updateComplete;
    await b.updateComplete;
    const label = a.shadowRoot!.querySelector('label') as HTMLLabelElement;

    expect(inner(a).id).toBeTruthy();
    expect(label.htmlFor).toBe(inner(a).id);
    expect(inner(a).id).not.toBe(inner(b).id);
  });

  it('does not fire a change when the input is disabled', async () => {
    const el = await fixture<ALCheckbox>(html`<al-checkbox isDisabled>Subscribe</al-checkbox>`);
    await el.updateComplete;
    expect(inner(el).disabled).toBe(true);
    expect(box(el).className).toContain('al-is-disabled');

    let fired = 0;
    el.addEventListener('onCheckboxChange', () => fired++);
    inner(el).click();
    await el.updateComplete;
    expect(fired).toBe(0);
    expect(el.isChecked).toBeFalsy();
  });

  it('marks the field required on the real input, not only visually', async () => {
    const el = await fixture<ALCheckbox>(html`<al-checkbox isRequired>Terms</al-checkbox>`);
    await el.updateComplete;
    expect(inner(el).required).toBe(true);
    expect(inner(el).checkValidity()).toBe(false);
  });

  it('honours an explicit fieldId instead of generating one', async () => {
    const el = await fixture<ALCheckbox>(html`<al-checkbox fieldId="terms">Terms</al-checkbox>`);
    await el.updateComplete;
    expect(inner(el).id).toBe('terms');
    expect((el.shadowRoot!.querySelector('label') as HTMLLabelElement).htmlFor).toBe('terms');
  });

  it('renders the mixed state on the native input and announces it', async () => {
    // `isIndeterminate` used to be a CSS treatment only — the class and nothing
    // else — so a tri-state "select all" looked mixed and announced as plain
    // unchecked. Fixed 2026-08-24 with both halves: `.indeterminate` (a
    // property with no content attribute, and what paints the native glyph)
    // and `aria-checked="mixed"` (what a screen reader actually reads).
    const el = await fixture<ALCheckbox>(html`<al-checkbox isIndeterminate>All</al-checkbox>`);
    await el.updateComplete;

    expect(box(el).className).toContain('al-is-indeterminate');
    expect(inner(el).indeterminate).toBe(true);
    expect(inner(el).getAttribute('aria-checked')).toBe('mixed');
  });

  it('drops aria-checked once the mixed state resolves, so it cannot shadow the real one', async () => {
    // A stale `aria-checked="mixed"` would keep announcing "mixed" over a box
    // the user has since checked, which is worse than never having set it.
    const el = await fixture<ALCheckbox>(html`<al-checkbox isIndeterminate>All</al-checkbox>`);
    await el.updateComplete;
    el.isIndeterminate = false;
    await el.updateComplete;

    expect(inner(el).indeterminate).toBe(false);
    expect(inner(el).getAttribute('aria-checked')).toBeNull();
  });

  it('describes the input with the field note via aria-describedby', async () => {
    const el = await fixture<ALCheckbox>(html`<al-checkbox fieldNote="You can change this later.">Terms</al-checkbox>`);
    await el.updateComplete;

    const describedBy = inner(el).getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const note = el.shadowRoot!.querySelector(`[id="${describedBy}"]`);
    expect(note, 'aria-describedby must point at a node that exists').not.toBeNull();
    expect(note!.textContent!.trim()).toBe('You can change this later.');
  });

  it('references the error note from the input, and lists both notes when both render', async () => {
    // The id was generated ONLY when a fieldNote existed, and the error note
    // rendered with no id at all — so an errorNote on its own was visible and
    // referenced by nothing. A validation error is the single message that most
    // needs announcing, and it was the one guaranteed not to be.
    //
    // Fixed 2026-08-24: the error note gets its own generated id, and
    // aria-describedby is a LIST of the notes actually rendered. Note
    // al-field-note still declares no role/aria-live, so this makes the message
    // REACHABLE, not automatically announced on change — see field-note.test.ts.
    const el = await fixture<ALCheckbox>(html`<al-checkbox isError errorNote="You must accept the terms.">Terms</al-checkbox>`);
    await el.updateComplete;

    const notes = [...el.shadowRoot!.querySelectorAll('al-field-note')];
    const errorNote = notes.find((n) => n.textContent!.trim() === 'You must accept the terms.')!;
    expect(errorNote, 'the error note renders').toBeTruthy();
    expect(errorNote.id, 'and now carries an id to point at').toBeTruthy();

    const describedBy = inner(el).getAttribute('aria-describedby');
    expect(describedBy, 'the control points at it').toContain(errorNote.id);
  });

  it('drops the error note from aria-describedby when isError is not set', async () => {
    // The note is conditional on `isError`, so referencing it unconditionally
    // would point at an element that is not in the DOM — which makes the whole
    // attribute unreliable rather than merely incomplete.
    const el = await fixture<ALCheckbox>(html`<al-checkbox errorNote="You must accept the terms.">Terms</al-checkbox>`);
    await el.updateComplete;
    expect(inner(el).getAttribute('aria-describedby')).toBeNull();
  });

  it('contributes nothing to the owning form', async () => {
    // FINDING, documented not endorsed. Unlike al-input (input.ts:262 ->
    // controllers/form-associated.ts), al-checkbox declares no
    // `formAssociated`/ElementInternals: its <input> lives inside the shadow
    // root, so the form cannot see it and `name` is inert. Asserting FormData /
    // form.reset() / constraint validation here would be asserting an
    // aspiration, so this pins the gap instead.
    const form = await fixture<HTMLFormElement>(html`
      <form><al-checkbox name="terms" value="yes">Terms</al-checkbox></form>
    `);
    const el = form.querySelector('al-checkbox') as ALCheckbox;
    await el.updateComplete;

    await userEvent.click(inner(el));
    await el.updateComplete;

    expect(el.isChecked).toBe(true);
    expect((el.constructor as any).formAssociated).toBeFalsy();
    expect(new FormData(form).get('terms'), 'current behavior — not form-associated').toBeNull();
  });
});
