import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import './range';
import type { ALRange } from './range';

const slider = (el: ALRange) => el.shadowRoot!.querySelector('input[type="range"]') as HTMLInputElement;

describe('al-range', () => {
  it('never emits role="range" — it is not a real ARIA role', async () => {
    // The shipped component set role="range" on the input, which overrode the
    // implicit `slider` role and took aria-valuenow/min/max down with it.
    const el = await fixture<ALRange>(html`<al-range label="Volume" min="0" max="10"></al-range>`);
    await el.updateComplete;
    expect(el.shadowRoot!.innerHTML).not.toContain('role="range"');
    expect(slider(el).hasAttribute('role')).toBe(false);
    expect(slider(el).type).toBe('range');
  });

  it('keeps the implicit slider value semantics addressable', async () => {
    const el = await fixture<ALRange>(html`<al-range label="Volume" min="2" max="8" step="2" value="4"></al-range>`);
    await el.updateComplete;
    expect(slider(el).min).toBe('2');
    expect(slider(el).max).toBe('8');
    expect(slider(el).step).toBe('2');
    expect(slider(el).value).toBe('4');
  });

  it('lets the consumer label win instead of shadowing it with aria-label', async () => {
    // range.ts:169-176 — a hardcoded aria-label="range" used to override the
    // real <label for>.
    const el = await fixture<ALRange>(html`<al-range label="Volume"></al-range>`);
    await el.updateComplete;
    expect(slider(el).hasAttribute('aria-label')).toBe(false);

    const label = el.shadowRoot!.querySelector('label.al-c-range__label') as HTMLLabelElement;
    expect(label.htmlFor).toBe(slider(el).id);
    expect(label.htmlFor).toBeTruthy();
  });

  it('still gives the slider a name when there is no label at all', async () => {
    const el = await fixture<ALRange>(html`<al-range></al-range>`);
    await el.updateComplete;
    expect(slider(el).getAttribute('aria-label')).toBe('Range');
  });

  it('submits under the consumer name, not a hardcoded one', async () => {
    const el = await fixture<ALRange>(html`<al-range label="Volume" name="volume"></al-range>`);
    await el.updateComplete;
    expect(slider(el).name).toBe('volume');
    expect(slider(el).name).not.toBe('range');
  });

  it('names both thumbs and both number outputs in dual-range mode', async () => {
    // Two sliders with the same name are indistinguishable to a screen reader.
    const el = await fixture<ALRange>(html`<al-range behavior="range" label="Price" hasOutput min="0" max="100"></al-range>`);
    await el.updateComplete;

    const names = [...el.shadowRoot!.querySelectorAll('input')].map((i) => i.getAttribute('aria-label'));
    expect(names).toEqual(['Price minimum', 'Price maximum', 'Price minimum value', 'Price maximum value']);
    expect(new Set(names).size, 'every control needs a distinct name').toBe(names.length);
  });

  it('falls back to generic thumb names when the dual range has no label', async () => {
    const el = await fixture<ALRange>(html`<al-range behavior="range" min="0" max="100"></al-range>`);
    await el.updateComplete;
    const names = [...el.shadowRoot!.querySelectorAll('input[type="range"]')].map((i) => i.getAttribute('aria-label'));
    expect(names).toEqual(['Minimum', 'Maximum']);
  });

  it('names the single-range number output relative to its label', async () => {
    const el = await fixture<ALRange>(html`<al-range label="Volume" hasOutput></al-range>`);
    await el.updateComplete;
    const output = el.shadowRoot!.querySelector('input.al-c-range__output') as HTMLInputElement;
    expect(output.getAttribute('aria-label')).toBe('Volume value');
  });
});
