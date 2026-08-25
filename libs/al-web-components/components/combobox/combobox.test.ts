import { fixture, html } from '@open-wc/testing-helpers';
import { userEvent } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import './combobox';
import type { ALCombobox } from './combobox';
import type { ALComboboxItem } from './combobox.model';

const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

/** The <al-input> host inside the combobox's shadow root. */
const field = (el: ALCombobox) => el.shadowRoot!.querySelector('.al-c-combobox__input') as HTMLElement;
/** The real, focusable <input> — two shadow roots deep. */
const textbox = (el: ALCombobox) => field(el).shadowRoot!.querySelector('input') as HTMLInputElement;
const options = (el: ALCombobox) => [...el.shadowRoot!.querySelectorAll('[role="option"]')] as HTMLElement[];
const labels = (el: ALCombobox) => options(el).map((o) => o.textContent!.trim());
const key = (el: ALCombobox, code: string) =>
  textbox(el).dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, composed: true }));

const FRUIT: ALComboboxItem[] = [
  { label: 'Apple', value: 'apple' },
  { label: 'Apricot', value: 'apricot' },
  { label: 'Banana', value: 'banana' }
];

const withItems = (items: ALComboboxItem[] = FRUIT) =>
  fixture<ALCombobox>(html`<al-combobox label="Fruit" .items=${items}></al-combobox>`);

describe('al-combobox', () => {
  it('filters options client-side, case-insensitively, in the default auto mode', async () => {
    // combobox.ts:197-204. The substring match on `label` is the whole contract
    // of filterMode="auto"; a consumer that never touches `items` relies on it.
    const el = await withItems();
    await el.updateComplete;

    await userEvent.fill(textbox(el), 'AP');
    await el.updateComplete;

    expect(el.isActiveDropdown, 'typing must open the listbox').toBe(true);
    expect(labels(el)).toEqual(['Apple', 'Apricot']);
  });

  it('shows the empty message instead of an empty listbox when nothing matches', async () => {
    const el = await withItems();
    await el.updateComplete;

    await userEvent.fill(textbox(el), 'zzz');
    await el.updateComplete;

    expect(options(el)).toHaveLength(0);
    expect(el.shadowRoot!.querySelector('.al-c-combobox__empty')!.textContent!.trim()).toBe('No results found');
  });

  it('does no client-side filtering in manual mode, but still announces the query', async () => {
    // combobox.ts:199 — manual mode exists for async sources: the consumer owns
    // `items` and only needs onComboboxFilter. Filtering here anyway would hide
    // results the consumer just fetched.
    const el = await fixture<ALCombobox>(html`
      <al-combobox label="Fruit" filterMode="manual" .items=${FRUIT}></al-combobox>
    `);
    await el.updateComplete;
    const seen: unknown[] = [];
    el.addEventListener('onComboboxFilter', (e) => seen.push((e as CustomEvent).detail.query));

    await userEvent.fill(textbox(el), 'zzz');
    await el.updateComplete;

    expect(labels(el)).toEqual(['Apple', 'Apricot', 'Banana']);
    expect(seen.at(-1)).toBe('zzz');
  });

  it('opens on ArrowDown and highlights the first option through aria-activedescendant', async () => {
    // The highlight is virtual — DOM focus stays in the textbox — so
    // aria-activedescendant is the only thing that tells a screen reader which
    // option is current. It must resolve to a node that exists.
    const el = await withItems();
    await el.updateComplete;

    key(el, 'ArrowDown');
    await el.updateComplete;

    expect(el.isActiveDropdown).toBe(true);
    const active = field(el).getAttribute('aria-activedescendant');
    expect(active).toBeTruthy();
    expect(el.shadowRoot!.querySelector(`[id="${active}"]`), 'aria-activedescendant must point at a rendered option').not.toBeNull();
    expect(el.shadowRoot!.querySelector(`[id="${active}"]`)!.textContent!.trim()).toBe('Apple');
  });

  it('opens on ArrowUp at the LAST option', async () => {
    const el = await withItems();
    await el.updateComplete;

    key(el, 'ArrowUp');
    await el.updateComplete;

    const active = field(el).getAttribute('aria-activedescendant');
    expect(el.shadowRoot!.querySelector(`[id="${active}"]`)!.textContent!.trim()).toBe('Banana');
  });

  it('wraps the highlight around both ends of the list', async () => {
    const el = await withItems();
    await el.updateComplete;

    key(el, 'ArrowDown'); // Apple
    key(el, 'ArrowUp'); // wraps back to Banana
    await el.updateComplete;
    expect(options(el).findIndex((o) => o.getAttribute('aria-selected') === 'true')).toBe(2);

    key(el, 'ArrowDown'); // wraps forward to Apple
    await el.updateComplete;
    expect(options(el).findIndex((o) => o.getAttribute('aria-selected') === 'true')).toBe(0);
  });

  it('steps over disabled options and refuses to select one', async () => {
    // combobox.ts:311-324 / 284-287 — a disabled option must be neither
    // reachable by keyboard nor selectable by pointer, or the combobox reports
    // a value the consumer marked unavailable.
    const el = await withItems([
      { label: 'Apple', value: 'apple' },
      { label: 'Apricot', value: 'apricot', disabled: true },
      { label: 'Banana', value: 'banana' }
    ]);
    await el.updateComplete;

    key(el, 'ArrowDown');
    key(el, 'ArrowDown');
    await el.updateComplete;
    expect(options(el).findIndex((o) => o.getAttribute('aria-selected') === 'true')).toBe(2);

    const seen: unknown[] = [];
    el.addEventListener('onComboboxChange', (e) => seen.push(e));
    options(el)[1].click();
    await el.updateComplete;
    expect(seen).toHaveLength(0);
    expect(el.selectedValue).toBeUndefined();
  });

  it('commits the highlighted option on Enter and closes', async () => {
    const el = await withItems();
    await el.updateComplete;
    const seen: any[] = [];
    el.addEventListener('onComboboxChange', (e) => seen.push((e as CustomEvent).detail));

    key(el, 'ArrowDown');
    key(el, 'ArrowDown'); // Apricot
    key(el, 'Enter');
    await el.updateComplete;

    expect(el.value).toBe('Apricot');
    expect(el.selectedValue).toBe('apricot');
    expect(el.isActiveDropdown).toBe(false);
    expect(seen.at(-1)).toMatchObject({ value: 'apricot', label: 'Apricot' });
  });

  it('commits the option the pointer chose and writes its label back into the field', async () => {
    const el = await withItems();
    await el.updateComplete;

    field(el).click();
    await el.updateComplete;
    options(el)[2].click();
    await el.updateComplete;

    expect(el.value).toBe('Banana');
    expect(el.selectedValue).toBe('banana');
    expect(textbox(el).value, 'the chosen label has to appear in the real input').toBe('Banana');
  });

  it('falls back to the label when an option carries no explicit value', async () => {
    // combobox.model.ts documents `value` as optional. The fallback is at
    // combobox.ts:289.
    const el = await withItems([{ label: 'Cherry' }]);
    await el.updateComplete;
    let detail: any;
    el.addEventListener('onComboboxChange', (e) => (detail = (e as CustomEvent).detail));

    key(el, 'ArrowDown');
    key(el, 'Enter');
    await el.updateComplete;

    expect(el.selectedValue).toBe('Cherry');
    expect(detail.value).toBe('Cherry');
  });

  it('drops a stale selection as soon as the user edits the query', async () => {
    // combobox.ts:266-274 clears `selectedValue` on input. Without it the
    // component would still report the old committed option while the text no
    // longer matches it.
    const el = await withItems();
    await el.updateComplete;

    key(el, 'ArrowDown');
    key(el, 'Enter');
    await el.updateComplete;
    expect(el.selectedValue).toBe('apple');

    await userEvent.fill(textbox(el), 'Ban');
    await el.updateComplete;
    expect(el.selectedValue).toBeUndefined();
  });

  it('reports open and close exactly once each, and keeps aria-expanded in step', async () => {
    const el = await withItems();
    await el.updateComplete;
    const seen: string[] = [];
    el.addEventListener('onComboboxOpen', () => seen.push('open'));
    el.addEventListener('onComboboxClose', () => seen.push('close'));

    expect(field(el).getAttribute('aria-expanded')).toBe('false');

    field(el).click();
    field(el).click(); // combobox.ts:241 guards against a second open
    await el.updateComplete;
    expect(field(el).getAttribute('aria-expanded')).toBe('true');

    key(el, 'Escape');
    key(el, 'Escape'); // combobox.ts:258 guards against a second close
    await el.updateComplete;

    expect(el.isActiveDropdown).toBe(false);
    expect(field(el).getAttribute('aria-expanded')).toBe('false');
    expect(seen).toEqual(['open', 'close']);
  });

  it('closes on Tab so the popup never outlives focus', async () => {
    const el = await withItems();
    await el.updateComplete;
    field(el).click();
    await el.updateComplete;

    key(el, 'Tab');
    await el.updateComplete;
    expect(el.isActiveDropdown).toBe(false);
  });

  it('closes when the user clicks outside it', async () => {
    const el = await withItems();
    await el.updateComplete;
    field(el).click();
    await el.updateComplete;
    expect(el.isActiveDropdown).toBe(true);

    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }));
    await el.updateComplete;
    expect(el.isActiveDropdown).toBe(false);
  });

  it('stops listening for outside clicks once removed from the document', async () => {
    // combobox.ts:215/220 pair the document listener with disconnectedCallback.
    const el = await withItems();
    await el.updateComplete;
    field(el).click();
    await el.updateComplete;

    const seen: unknown[] = [];
    el.addEventListener('onComboboxClose', (e) => seen.push(e));
    el.remove();
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }));
    await el.updateComplete;

    expect(seen).toHaveLength(0);
  });

  it('refuses to open while disabled', async () => {
    // combobox.ts:241 — the guard is on openDropdown itself, not only on the
    // rendered affordance, so a stray click cannot reveal the listbox.
    const el = await fixture<ALCombobox>(html`<al-combobox label="Fruit" isDisabled .items=${FRUIT}></al-combobox>`);
    await el.updateComplete;

    field(el).click();
    key(el, 'ArrowDown');
    await el.updateComplete;

    expect(el.isActiveDropdown).toBeFalsy();
    expect(el.shadowRoot!.querySelector('.al-c-combobox__panel')).toBeNull();
  });

  it('offers a clear affordance only when there is something to clear', async () => {
    const el = await withItems();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.al-c-combobox__clear-button')).toBeNull();

    await userEvent.fill(textbox(el), 'Ap');
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.al-c-combobox__clear-button')).not.toBeNull();
  });

  it('resets the query and the selection when cleared', async () => {
    const el = await withItems();
    await el.updateComplete;

    key(el, 'ArrowDown');
    key(el, 'Enter');
    await el.updateComplete;
    expect(el.selectedValue).toBe('apple');

    const seen: unknown[] = [];
    el.addEventListener('onComboboxFilter', (e) => seen.push((e as CustomEvent).detail.query));
    (el.shadowRoot!.querySelector('.al-c-combobox__clear-button') as HTMLElement).click();
    await el.updateComplete;

    expect(el.value).toBe('');
    expect(el.selectedValue).toBeUndefined();
    expect(textbox(el).value).toBe('');
    expect(seen.at(-1)).toBe('');
  });

  it('marks the current option with aria-selected and only that one', async () => {
    const el = await withItems();
    await el.updateComplete;

    key(el, 'ArrowDown');
    await el.updateComplete;

    expect(options(el).map((o) => o.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(el.shadowRoot!.querySelector('[role="listbox"]')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('[role="listbox"]')!.getAttribute('aria-label')).toBe('Fruit');
  });

  it('renders the ARIA on the <al-input> wrapper, not on the focusable input', async () => {
    // FINDING, documented not endorsed. combobox.ts:401-422 puts role="combobox",
    // aria-expanded, aria-controls, aria-autocomplete and aria-activedescendant
    // on the <al-input> HOST. The element that actually takes focus is the
    // native <input> inside al-input's shadow root, and it carries none of
    // them — al-input sets no `delegatesFocus` and no ARIA reflection. A screen
    // reader user therefore lands on a plain "edit text" with no expanded state
    // and no option announcements. al-select had the mirror-image problem and
    // was fixed by putting the role on the focused element (select.test.ts:19).
    const el = await withItems();
    await el.updateComplete;
    key(el, 'ArrowDown');
    await el.updateComplete;

    expect(field(el).getAttribute('role')).toBe('combobox');
    expect(field(el).getAttribute('aria-haspopup')).toBe('listbox');

    const focusable = textbox(el);
    expect(focusable.getAttribute('role'), 'current behavior — see comment').toBeNull();
    expect(focusable.getAttribute('aria-expanded'), 'current behavior — see comment').toBeNull();
    expect(focusable.getAttribute('aria-activedescendant'), 'current behavior — see comment').toBeNull();
  });

  it('does not actually restore focus to the text field after a selection', async () => {
    // FINDING, documented not endorsed. combobox.ts:295 calls `.focus()` on the
    // <al-input> HOST, which is a custom element with no tabindex and no
    // `delegatesFocus` in its shadowRootOptions — so the call is a no-op and
    // focus is left wherever the click put it. The fix is to focus the inner
    // input (or give al-input delegatesFocus).
    const el = await withItems();
    await el.updateComplete;

    const elsewhere = document.createElement('button');
    document.body.appendChild(elsewhere);
    elsewhere.focus();

    field(el).click();
    await el.updateComplete;
    options(el)[0].click();
    await el.updateComplete;
    await tick();

    expect(el.value).toBe('Apple');
    expect(document.activeElement, 'current behavior — focus never comes back').toBe(elsewhere);
    expect(field(el).shadowRoot!.activeElement).toBeNull();
    elsewhere.remove();
  });

  it('describes the field with the field note via aria-describedby', async () => {
    const el = await fixture<ALCombobox>(html`
      <al-combobox label="Fruit" ariaDescribedBy="fruit-note" fieldNote="Start typing." .items=${FRUIT}></al-combobox>
    `);
    await el.updateComplete;

    const note = el.shadowRoot!.querySelector('[id="fruit-note"]');
    expect(note, 'aria-describedby must point at a node that exists').not.toBeNull();
    expect(note!.textContent!.trim()).toBe('Start typing.');
    expect(field(el).getAttribute('aria-describedby')).toBe('fruit-note');
  });
});
