import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import './select';
import '../list-item/list-item';
import type { ALSelect } from './select';

const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
const combobox = (el: ALSelect) => el.shadowRoot!.querySelector('.al-c-select__input') as HTMLElement;

const withOptions = () => fixture<ALSelect>(html`
  <al-select label="Fruit">
    <al-list-item>Apple</al-list-item>
    <al-list-item>Banana</al-list-item>
  </al-select>
`);

describe('al-select', () => {
  it('exposes combobox semantics on the field', async () => {
    // select.ts:70-88 documents why: before the a11y pass the select had no
    // role, no aria-expanded, no aria-haspopup — a screen reader announced
    // "edit text" and never mentioned a list.
    const el = await withOptions();
    await el.updateComplete;
    expect(combobox(el).getAttribute('role')).toBe('combobox');
    expect(combobox(el).getAttribute('aria-haspopup')).toBe('listbox');
    expect(combobox(el).getAttribute('aria-expanded')).toBe('false');
  });

  it('flips aria-expanded and points aria-controls at the panel that exists', async () => {
    const el = await withOptions();
    await el.updateComplete;
    // Closed: there is no panel, so aria-controls must NOT name one.
    expect(combobox(el).hasAttribute('aria-controls')).toBe(false);

    el.toggleActive();
    await el.updateComplete;
    expect(combobox(el).getAttribute('aria-expanded')).toBe('true');
    const controls = combobox(el).getAttribute('aria-controls');
    expect(controls).toBeTruthy();
    expect(
      el.shadowRoot!.querySelector(`[id="${controls}"]`),
      'aria-controls must resolve to the rendered dropdown panel'
    ).not.toBeNull();

    el.toggleActive();
    await el.updateComplete;
    expect(combobox(el).getAttribute('aria-expanded')).toBe('false');
    expect(combobox(el).hasAttribute('aria-controls')).toBe(false);
  });

  it('opens on click and reports open/close through its events', async () => {
    const el = await withOptions();
    await el.updateComplete;
    const seen: string[] = [];
    el.addEventListener('onSelectOpen', () => seen.push('open'));
    el.addEventListener('onSelectClose', () => seen.push('close'));

    combobox(el).click();
    await el.updateComplete;
    expect(el.isActiveDropdown).toBe(true);

    combobox(el).click();
    await el.updateComplete;
    expect(el.isActiveDropdown).toBe(false);
    expect(seen).toEqual(['open', 'close']);
  });

  it('opens with Enter and with Space from the keyboard', async () => {
    for (const code of ['Enter', 'Space']) {
      const el = await withOptions();
      await el.updateComplete;
      combobox(el).dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, composed: true }));
      await el.updateComplete;
      expect(el.isActiveDropdown, code).toBe(true);
    }
  });

  it('closes the open panel on Escape', async () => {
    const el = await withOptions();
    el.toggleActive();
    await el.updateComplete;
    const panel = el.shadowRoot!.querySelector('.al-c-select__panel')!;
    panel.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true, composed: true }));
    await el.updateComplete;
    expect(el.isActiveDropdown).toBe(false);
  });

  it('closes when the user clicks outside it', async () => {
    const el = await withOptions();
    el.toggleActive();
    await el.updateComplete;
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }));
    await el.updateComplete;
    expect(el.isActiveDropdown).toBe(false);
  });

  it('adopts the chosen option as its value and marks only that one active', async () => {
    // select.ts:376-400 (addClickHandlers) — the handlers are attached 1ms
    // after firstUpdated, so this also pins that timing contract.
    const el = await withOptions();
    await el.updateComplete;
    await tick();
    el.toggleActive();
    await el.updateComplete;

    const [apple, banana] = [...el.querySelectorAll('al-list-item')] as any[];
    (banana.shadowRoot.querySelector('.al-c-list-item__link') as HTMLElement).click();
    await el.updateComplete;

    expect(el.value).toBe('Banana');
    expect(banana.isActive).toBe(true);
    expect(apple.isActive).toBeFalsy();
  });

  it('does not stamp role="option" onto the consumer-supplied list items', async () => {
    // Deliberate: the options render their own <button>, so an `option` role
    // would nest an interactive control inside an interactive role.
    // select.ts:80-87 records the decision; this keeps it from drifting back.
    const el = await withOptions();
    el.toggleActive();
    await el.updateComplete;
    for (const item of el.querySelectorAll('al-list-item')) {
      expect(item.getAttribute('role')).toBeNull();
    }
  });
});
