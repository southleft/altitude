import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import './toggle-button-group';
import '../toggle-button/toggle-button';
import type { ALToggleButtonGroup } from './toggle-button-group';
import type { ALToggleButton } from '../toggle-button/toggle-button';

const buttons = (el: ALToggleButtonGroup) => [...el.querySelectorAll('al-toggle-button')] as ALToggleButton[];
const surface = (button: ALToggleButton) => button.shadowRoot!.querySelector('.al-c-toggle-button') as HTMLElement;
const selected = (el: ALToggleButtonGroup) => buttons(el).map((b) => b.isSelected === true);

const group = () =>
  fixture<ALToggleButtonGroup>(html`
    <al-toggle-button-group>
      <al-toggle-button>Left</al-toggle-button>
      <al-toggle-button>Center</al-toggle-button>
      <al-toggle-button>Right</al-toggle-button>
    </al-toggle-button-group>
  `);

describe('al-toggle-button-group', () => {
  it('enforces single selection across its buttons', async () => {
    // toggle-button-group.ts:80-85 is the group's entire reason to exist: an
    // al-toggle-button never deselects itself (toggle-button.ts:159-164), so
    // without this listener every button the user pressed would stay lit.
    const el = await group();
    await el.updateComplete;
    const [left, center] = buttons(el);

    surface(left).click();
    await el.updateComplete;
    await left.updateComplete;
    expect(selected(el)).toEqual([true, false, false]);
    expect(el.selectedItem).toBe(left);

    surface(center).click();
    await el.updateComplete;
    await Promise.all(buttons(el).map((b) => b.updateComplete));
    expect(selected(el), 'the previous choice must be cleared').toEqual([false, true, false]);
    expect(el.selectedItem).toBe(center);
  });

  it('keeps the current button selected when it is pressed again', async () => {
    // toggle-button-group.ts:81 guards on `this.selectedItem !== item`. Without
    // the guard, re-pressing the active button would clear it and the group
    // would momentarily have no selection.
    const el = await group();
    await el.updateComplete;
    const [left] = buttons(el);

    surface(left).click();
    surface(left).click();
    await el.updateComplete;
    await left.updateComplete;

    expect(selected(el)).toEqual([true, false, false]);
    expect(el.selectedItem).toBe(left);
  });

  it('clears the selection when a mousedown lands outside the group', async () => {
    const el = await group();
    await el.updateComplete;
    const [left] = buttons(el);

    surface(left).click();
    await el.updateComplete;
    expect(left.isSelected).toBe(true);

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }));
    await el.updateComplete;
    await left.updateComplete;
    expect(left.isSelected).toBe(false);
  });

  it('keeps the selection when the mousedown is inside the group', async () => {
    const el = await group();
    await el.updateComplete;
    const [left] = buttons(el);

    surface(left).click();
    await el.updateComplete;

    surface(left).dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }));
    await el.updateComplete;
    await left.updateComplete;
    expect(left.isSelected).toBe(true);
  });

  it('stops listening for outside clicks once removed from the document', async () => {
    // toggle-button-group.ts:63/72 pair the global mousedown listener with
    // disconnectedCallback; a missed removal keeps mutating a detached tree.
    const el = await group();
    await el.updateComplete;
    const [left] = buttons(el);
    surface(left).click();
    await el.updateComplete;

    el.remove();
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }));
    await el.updateComplete;
    await left.updateComplete;
    expect(left.isSelected).toBe(true);
  });

  it('applies the background variant to the group container', async () => {
    const el = await fixture<ALToggleButtonGroup>(html`
      <al-toggle-button-group variant="background"><al-toggle-button>Left</al-toggle-button></al-toggle-button-group>
    `);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.al-c-toggle-button-group')!.className).toContain(
      'al-c-toggle-button-group--background'
    );
  });

  it('exposes no grouping semantics and no roving tabindex', async () => {
    // FINDING, documented not endorsed. AGENTS.md justifies keeping this
    // component (over `<al-layout>`) by "roving keyboard selection", but
    // toggle-button-group.ts:106-118 renders a bare <div>: no role="group" or
    // "radiogroup", no aria-label, no arrow-key handler, and every button keeps
    // tabindex="0" so Tab walks through all of them individually. The single-
    // select STATE is real (tested above); the announced grouping and the
    // roving keyboard model are not implemented.
    const el = await group();
    await el.updateComplete;

    const container = el.shadowRoot!.querySelector('.al-c-toggle-button-group') as HTMLElement;
    expect(container.tagName.toLowerCase()).toBe('div');
    expect(container.getAttribute('role'), 'current behavior — see comment').toBeNull();
    expect(buttons(el).map((b) => surface(b).getAttribute('tabindex'))).toEqual(['0', '0', '0']);

    // Arrow keys reach the group and do nothing.
    const [left] = buttons(el);
    surface(left).click();
    await el.updateComplete;
    surface(left).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', bubbles: true, composed: true }));
    await el.updateComplete;
    expect(selected(el), 'current behavior — no roving selection').toEqual([true, false, false]);
  });
});
