import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import './toggle-button';
import '../popover/popover';
import type { ALToggleButton } from './toggle-button';
import type { ALPopover } from '../popover/popover';

const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
const surface = (el: ALToggleButton) => el.shadowRoot!.querySelector('.al-c-toggle-button') as HTMLElement;
const content = (el: ALToggleButton) => el.shadowRoot!.querySelector('.al-c-toggle-button__content') as HTMLElement;
const key = (target: HTMLElement, code: string) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, composed: true }));

const plain = () => fixture<ALToggleButton>(html`<al-toggle-button>Bold</al-toggle-button>`);

const withPopover = () =>
  fixture<ALToggleButton>(html`
    <al-toggle-button>
      <al-popover>Panel body</al-popover>
    </al-toggle-button>
  `);

describe('al-toggle-button', () => {
  it('selects on click and reports it through onToggleButtonSelect', async () => {
    const el = await plain();
    await el.updateComplete;
    const seen: any[] = [];
    el.addEventListener('onToggleButtonSelect', (e) => seen.push((e as CustomEvent).detail));

    surface(el).click();
    await el.updateComplete;

    expect(el.isSelected).toBe(true);
    expect(surface(el).className).toContain('al-is-selected');
    expect(seen.at(-1)).toEqual({ item: el, selected: true });
  });

  it('stays selected on a second click when it owns no toggle surface', async () => {
    // toggle-button.ts:159-172 — without a slotted popover/menu, `hasToggle` is
    // false and the button is a RADIO-like member of a group: only the group
    // (or a click outside) deselects it. A naive "toggleSelected() flips a
    // boolean" refactor would break single-select groups.
    const el = await plain();
    await el.updateComplete;
    const seen: string[] = [];
    el.addEventListener('onToggleButtonSelect', () => seen.push('select'));
    el.addEventListener('onToggleButtonDeselect', () => seen.push('deselect'));

    surface(el).click();
    surface(el).click();
    await el.updateComplete;

    expect(el.isSelected).toBe(true);
    expect(seen).toEqual(['select', 'select']);
  });

  it('toggles both ways once a popover makes it a disclosure', async () => {
    // toggle-button.ts:128-142 sets hasToggle from the first slotted element
    // AFTER firstUpdated, so this also pins that detection.
    const el = await withPopover();
    await el.updateComplete;
    await tick();
    expect(el.hasToggle).toBe(true);

    const popover = el.querySelector('al-popover') as ALPopover;
    const seen: string[] = [];
    el.addEventListener('onToggleButtonSelect', () => seen.push('select'));
    el.addEventListener('onToggleButtonDeselect', () => seen.push('deselect'));

    // Only a click on the button's own content counts — clicks inside the
    // popover must not close it (toggle-button.ts:227-231).
    content(el).click();
    await el.updateComplete;
    expect(el.isSelected).toBe(true);
    expect(popover.isActive).toBe(true);

    content(el).click();
    await el.updateComplete;
    expect(el.isSelected).toBe(false);
    expect(popover.isActive).toBe(false);
    expect(seen).toEqual(['select', 'deselect']);
  });

  it('ignores clicks that land inside the slotted popover', async () => {
    // Regression shape: interacting with the panel content used to close the
    // panel, because every click reached toggleSelected().
    const el = await withPopover();
    await el.updateComplete;
    await tick();

    content(el).click();
    await el.updateComplete;
    expect(el.isSelected).toBe(true);

    (el.querySelector('al-popover') as HTMLElement).click();
    await el.updateComplete;
    expect(el.isSelected).toBe(true);
  });

  it('selects on Enter and deselects on Escape', async () => {
    const el = await plain();
    await el.updateComplete;
    const seen: string[] = [];
    el.addEventListener('onToggleButtonSelect', () => seen.push('select'));
    el.addEventListener('onToggleButtonDeselect', () => seen.push('deselect'));

    key(surface(el), 'Enter');
    await el.updateComplete;
    expect(el.isSelected).toBe(true);

    key(surface(el), 'Escape');
    await el.updateComplete;
    expect(el.isSelected).toBe(false);
    expect(seen).toEqual(['select', 'deselect']);
  });

  it('returns focus to the button when it is deselected', async () => {
    // toggle-button.ts:203-213 — Escape out of an open popover has to leave
    // focus somewhere reachable, or the keyboard user is dropped on <body>.
    const el = await plain();
    await el.updateComplete;

    key(surface(el), 'Enter');
    await el.updateComplete;
    document.body.focus();

    key(surface(el), 'Escape');
    await el.updateComplete;
    expect(el.shadowRoot!.activeElement).toBe(surface(el));
  });

  it('deselects when a mousedown lands outside it', async () => {
    const el = await plain();
    await el.updateComplete;

    surface(el).click();
    await el.updateComplete;
    expect(el.isSelected).toBe(true);

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }));
    await el.updateComplete;
    expect(el.isSelected).toBe(false);
  });

  it('stops listening for outside clicks once removed from the document', async () => {
    // toggle-button.ts:107/118 pair a global mousedown listener with
    // disconnectedCallback. A missing removal is a leak that also fires
    // deselect events from a detached element.
    const el = await plain();
    await el.updateComplete;
    surface(el).click();
    await el.updateComplete;

    const seen: unknown[] = [];
    el.addEventListener('onToggleButtonDeselect', (e) => seen.push(e));
    el.remove();
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }));
    await el.updateComplete;

    expect(seen).toHaveLength(0);
    expect(el.isSelected).toBe(true);
  });

  it('is reachable by keyboard and applies the background variant', async () => {
    const el = await fixture<ALToggleButton>(html`<al-toggle-button variant="background">Bold</al-toggle-button>`);
    await el.updateComplete;
    expect(surface(el).getAttribute('tabindex')).toBe('0');
    expect(surface(el).className).toContain('al-c-toggle-button--background');
  });

  it('exposes no pressed state to assistive technology', async () => {
    // FINDING, documented not endorsed. The selected state is carried purely by
    // the `al-is-selected` class (toggle-button.ts:268-277): the interactive
    // element is a <div tabindex="0"> with no role="button" and no
    // aria-pressed, so a screen reader announces neither "button" nor its
    // on/off state. Contrast al-tab, which does carry aria-selected.
    const el = await plain();
    await el.updateComplete;
    surface(el).click();
    await el.updateComplete;

    expect(surface(el).className).toContain('al-is-selected');
    expect(surface(el).getAttribute('role'), 'current behavior — see comment').toBeNull();
    expect(surface(el).getAttribute('aria-pressed'), 'current behavior — see comment').toBeNull();
  });
});
