import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import './field-note';
import '../input/input';
import type { ALFieldNote } from './field-note';
import type { ALInput } from '../input/input';

const root = (el: ALFieldNote) => el.shadowRoot!.querySelector('.al-c-field-note') as HTMLElement;

describe('al-field-note', () => {
  it('projects its slotted content, which is what aria-describedby ends up announcing', async () => {
    // The note is never read for its own sake — every field component renders
    // one and points `aria-describedby` at it (input.ts:381-386). If the slot
    // stopped projecting, the description would silently become empty while the
    // IDREF still resolved, so nothing else in the suite would notice.
    const el = await fixture<ALFieldNote>(html`<al-field-note>Max 20 characters</al-field-note>`);
    await el.updateComplete;

    const slot = root(el).querySelector('slot') as HTMLSlotElement;
    expect(slot.assignedNodes({ flatten: true }).map((n) => n.textContent!.trim())).toEqual(['Max 20 characters']);
    expect(el.textContent!.trim()).toBe('Max 20 characters');
  });

  it('turns the error treatment on and back off', async () => {
    // Both directions on purpose: a render that only ever adds `al-is-error`
    // passes a one-way assertion.
    const el = await fixture<ALFieldNote>(html`<al-field-note>Required</al-field-note>`);
    await el.updateComplete;
    expect(root(el).className).not.toContain('al-is-error');

    el.isError = true;
    await el.updateComplete;
    expect(root(el).className).toContain('al-is-error');

    el.isError = false;
    await el.updateComplete;
    expect(root(el).className).not.toContain('al-is-error');
  });

  it('carries error and disabled treatments at the same time', async () => {
    const el = await fixture<ALFieldNote>(html`<al-field-note isError isDisabled>Nope</al-field-note>`);
    await el.updateComplete;
    expect(root(el).className).toContain('al-is-error');
    expect(root(el).className).toContain('al-is-disabled');
  });

  it('keeps the id on the host, where the describing IDREF can reach it', async () => {
    // Every consumer stamps `id` on the <al-field-note> ELEMENT, not on the div
    // inside its shadow root, because an IDREF cannot cross a shadow boundary.
    // If the component ever moved that id inward, aria-describedby would point
    // at nothing and axe would report aria-valid-attr-value.
    const el = await fixture<ALInput>(html`<al-input label="Email" fieldNote="We never share it."></al-input>`);
    await el.updateComplete;

    const describedBy = el.shadowRoot!.querySelector('input')!.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();

    const note = el.shadowRoot!.querySelector(`[id="${describedBy}"]`);
    expect(note!.tagName.toLowerCase()).toBe('al-field-note');
    expect(note!.shadowRoot!.querySelector(`[id="${describedBy}"]`), 'the id must not be re-emitted inside the shadow root').toBeNull();
  });

  it('is announced only on demand — it declares no live region', async () => {
    // Documents current behavior, not an endorsement. An `<al-field-note isError>`
    // is a plain div: no role="alert", no aria-live. It is announced only while
    // the describing control has focus, so an error revealed after blur is
    // silent. See the checkbox suite for the related gap where the error note
    // is not even referenced by aria-describedby.
    const el = await fixture<ALFieldNote>(html`<al-field-note isError>Enter a valid email</al-field-note>`);
    await el.updateComplete;
    expect(root(el).hasAttribute('role')).toBe(false);
    expect(root(el).hasAttribute('aria-live')).toBe(false);
    expect(el.hasAttribute('role')).toBe(false);
  });
});
