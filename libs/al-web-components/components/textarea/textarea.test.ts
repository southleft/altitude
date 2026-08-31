import { fixture, html } from '@open-wc/testing-helpers';
import { userEvent } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import './textarea';
import type { ALTextarea } from './textarea';

const inner = (el: ALTextarea) => el.shadowRoot!.querySelector('textarea.al-c-textarea__input') as HTMLTextAreaElement;
const box = (el: ALTextarea) => el.shadowRoot!.querySelector('.al-c-textarea') as HTMLElement;

describe('al-textarea', () => {
  it('associates the label with the textarea through a generated id', async () => {
    // textarea.ts:186-193 — fieldId falls back to nanoid() so the for/id pair is
    // never empty. Two instances must not collide.
    const a = await fixture<ALTextarea>(html`<al-textarea label="Bio"></al-textarea>`);
    const b = await fixture<ALTextarea>(html`<al-textarea label="Notes"></al-textarea>`);
    await a.updateComplete;
    await b.updateComplete;
    const label = a.shadowRoot!.querySelector('label') as HTMLLabelElement;

    expect(inner(a).id).toBeTruthy();
    expect(label.htmlFor).toBe(inner(a).id);
    expect(inner(a).id).not.toBe(inner(b).id);
  });

  it('honours an explicit fieldId instead of generating one', async () => {
    const el = await fixture<ALTextarea>(html`<al-textarea fieldId="bio"></al-textarea>`);
    await el.updateComplete;
    expect(inner(el).id).toBe('bio');
    expect((el.shadowRoot!.querySelector('label') as HTMLLabelElement).htmlFor).toBe('bio');
  });

  it('emits onTextareaChange with the new value as the user types', async () => {
    const el = await fixture<ALTextarea>(html`<al-textarea label="Bio"></al-textarea>`);
    await el.updateComplete;
    const seen: unknown[] = [];
    el.addEventListener('onTextareaChange', (e) => seen.push((e as CustomEvent).detail.value));

    await userEvent.fill(inner(el), 'hello');
    await el.updateComplete;

    expect(seen.at(-1)).toBe('hello');
    expect(el.value).toBe('hello');
  });

  it('sets isActive only while the field has content', async () => {
    // textarea.ts:232-236 — this is what floats the label. Asserting both
    // directions, because a handler that only ever sets `true` would pass a
    // one-way test.
    const el = await fixture<ALTextarea>(html`<al-textarea label="Bio"></al-textarea>`);
    await el.updateComplete;
    expect(el.isActive).toBeFalsy();

    await userEvent.fill(inner(el), 'x');
    await el.updateComplete;
    expect(el.isActive).toBe(true);
    expect(box(el).className).toContain('al-is-active');

    await userEvent.clear(inner(el));
    await el.updateComplete;
    expect(el.isActive).toBe(false);
    expect(box(el).className).not.toContain('al-is-active');
  });

  it('starts active with a preset value and seeds the character count', async () => {
    // textarea.ts:209-212 — firstUpdated has to do this, because no input event
    // ever fires for a value supplied as markup.
    const el = await fixture<ALTextarea>(html`<al-textarea label="Bio" value="preset" maxLength="10"></al-textarea>`);
    await el.updateComplete;

    expect(el.isActive).toBe(true);
    expect(el.maxLengthValue).toBe(6);
    expect(inner(el).value).toBe('preset');
    expect(el.shadowRoot!.querySelector('.al-c-textarea__footer')!.textContent).toContain('6/10');
  });

  it('counts characters against maxLength as the user types', async () => {
    const el = await fixture<ALTextarea>(html`<al-textarea label="Bio" maxLength="10"></al-textarea>`);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.al-c-textarea__footer')!.textContent).toContain('0/10');

    await userEvent.fill(inner(el), 'abcd');
    await el.updateComplete;
    expect(el.maxLengthValue).toBe(4);
    expect(inner(el).maxLength).toBe(10);
    expect(el.shadowRoot!.querySelector('.al-c-textarea__footer')!.textContent).toContain('4/10');
  });

  it('describes the textarea with the field note via aria-describedby', async () => {
    const el = await fixture<ALTextarea>(html`<al-textarea label="Bio" fieldNote="Keep it short."></al-textarea>`);
    await el.updateComplete;

    const describedBy = inner(el).getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const note = el.shadowRoot!.querySelector(`[id="${describedBy}"]`);
    expect(note, 'aria-describedby must point at a node that exists').not.toBeNull();
    expect(note!.textContent!.trim()).toBe('Keep it short.');
  });

  it('references the error note from the textarea, and lists both notes when both render', async () => {
    // The id was generated ONLY when a fieldNote existed, and the error note
    // rendered with no id at all — so an errorNote on its own was visible and
    // referenced by nothing. A validation error is the single message that most
    // needs announcing, and it was the one guaranteed not to be.
    //
    // Fixed 2026-08-24: the error note gets its own generated id, and
    // aria-describedby is a LIST of the notes actually rendered. al-field-note
    // still declares no role/aria-live, so this makes the message REACHABLE,
    // not automatically announced on change — see field-note.test.ts.
    const el = await fixture<ALTextarea>(
      html`<al-textarea label="Bio" isError errorNote="This field is required."></al-textarea>`
    );
    await el.updateComplete;

    const notes = [...el.shadowRoot!.querySelectorAll('al-field-note')];
    const errorNote = notes.find((n) => n.textContent!.trim() === 'This field is required.')!;
    expect(errorNote, 'the error note renders').toBeTruthy();
    expect(errorNote.id, 'and now carries an id to point at').toBeTruthy();
    expect(inner(el).getAttribute('aria-describedby'), 'the control points at it').toContain(errorNote.id);
  });

  it('drops the error note from aria-describedby when isError is not set', async () => {
    // The note is conditional on `isError`, so referencing it unconditionally
    // would point at an element that is not in the DOM — which makes the whole
    // attribute unreliable rather than merely incomplete.
    const el = await fixture<ALTextarea>(
      html`<al-textarea label="Bio" errorNote="This field is required."></al-textarea>`
    );
    await el.updateComplete;
    expect(inner(el).getAttribute('aria-describedby')).toBeNull();
  });

  it('reflects required, readonly and disabled onto the real textarea', async () => {
    const el = await fixture<ALTextarea>(html`<al-textarea label="Bio" isRequired isReadonly isDisabled></al-textarea>`);
    await el.updateComplete;

    expect(inner(el).required).toBe(true);
    expect(inner(el).readOnly).toBe(true);
    expect(inner(el).disabled).toBe(true);
    expect(box(el).className).toContain('al-is-disabled');
    expect(el.shadowRoot!.querySelector('.al-c-textarea__asterisk')).not.toBeNull();
  });

  it('fails constraint validation while a required field is empty', async () => {
    const el = await fixture<ALTextarea>(html`<al-textarea label="Bio" isRequired></al-textarea>`);
    await el.updateComplete;
    expect(inner(el).checkValidity()).toBe(false);

    await userEvent.fill(inner(el), 'something');
    await el.updateComplete;
    expect(inner(el).checkValidity()).toBe(true);
  });

  it('passes sizing and hint attributes through to the real textarea', async () => {
    const el = await fixture<ALTextarea>(html`
      <al-textarea label="Bio" rows="6" cols="40" minLength="5" placeholder="Say something"></al-textarea>
    `);
    await el.updateComplete;

    expect(inner(el).rows).toBe(6);
    expect(inner(el).cols).toBe(40);
    expect(inner(el).minLength).toBe(5);
    expect(inner(el).placeholder).toBe('Say something');
  });

  it('renders the required marker in the before slot when the label is hidden', async () => {
    // textarea.ts:306-315 — with the label visually hidden the asterisk has to
    // move inside the field, or the only "required" affordance disappears.
    const el = await fixture<ALTextarea>(html`<al-textarea label="Bio" isRequired hideLabel></al-textarea>`);
    await el.updateComplete;

    expect(box(el).className).toContain('al-has-hidden-label');
    expect(el.shadowRoot!.querySelector('.al-c-textarea__asterisk--hidden-label')).not.toBeNull();
  });

  it('contributes nothing to the owning form', async () => {
    // FINDING, documented not endorsed. Unlike al-input (input.ts:262 ->
    // controllers/form-associated.ts), al-textarea declares no
    // `formAssociated`/ElementInternals and never calls setValue, so the typed
    // value cannot reach FormData — its <textarea> is inside the shadow root.
    const form = await fixture<HTMLFormElement>(html`
      <form><al-textarea name="bio" label="Bio"></al-textarea></form>
    `);
    const el = form.querySelector('al-textarea') as ALTextarea;
    await el.updateComplete;

    await userEvent.fill(inner(el), 'hello');
    await el.updateComplete;

    expect(el.value).toBe('hello');
    expect((el.constructor as any).formAssociated).toBeFalsy();
    expect(new FormData(form).get('bio'), 'current behavior — textarea is not form-associated').toBeNull();
  });
});
