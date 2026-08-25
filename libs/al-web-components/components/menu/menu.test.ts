import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import './menu';
import '../menu-item/menu-item';
import '../list/list';
import '../list-item/list-item';
import type { ALMenu } from './menu';

const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

/**
 * Fire a keydown AT a menu item.
 *
 * menu.ts:370-372 only acts when `e.target` is an ALMenuItem, and the listener
 * is on the <ul> inside al-menu's shadow root — so the event must both
 * originate at the light-DOM item and be `composed`, or it never crosses the
 * boundary and the handler silently does nothing.
 */
const press = (item: Element, key: string) =>
  item.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true }));

const menuOf = async (count: number) => {
  const el = await fixture<ALMenu>(html`
    <al-menu label="Account">
      ${Array.from({ length: count }, (_, i) => html`<al-menu-item href="/a${i}" value=${`v${i}`}>Item ${i}</al-menu-item>`)}
    </al-menu>
  `);
  await el.updateComplete;
  await tick();
  return el;
};

describe('al-menu', () => {
  it('is a list, not a menu — deliberately', async () => {
    // menu.ts:419-439 records the decision: every item renders an <al-link>
    // (a real <a href>/<button>), so with role="menu" there is no `menuitem`
    // anywhere below and axe reports aria-required-children on every story;
    // pushing `menuitem` onto the items would wrap an interactive role around
    // a separate interactive control.
    const el = await fixture<ALMenu>(html`
      <al-menu label="Account"><al-menu-item href="/a">A</al-menu-item></al-menu>
    `);
    await el.updateComplete;
    const list = el.shadowRoot!.querySelector('ul')!;
    expect(list.getAttribute('role')).toBe('list');
    expect(list.getAttribute('aria-label')).toBe('Account');
  });

  it('has no menu / menuitem role anywhere in its rendered tree', async () => {
    const el = await fixture<ALMenu>(html`
      <al-menu label="Account">
        <al-menu-item href="/a">A</al-menu-item>
        <al-menu-item href="/b">B</al-menu-item>
      </al-menu>
    `);
    await el.updateComplete;
    await tick();

    const roles = [
      ...[...el.shadowRoot!.querySelectorAll('[role]')].map((n) => n.getAttribute('role')),
      ...[...el.querySelectorAll('al-menu-item')].flatMap((item) =>
        [...item.shadowRoot!.querySelectorAll('[role]')].map((n) => n.getAttribute('role'))
      ),
    ];
    expect(roles).not.toContain('menu');
    expect(roles).not.toContain('menuitem');
  });

  it('spells role="list" out explicitly on the <ul>', async () => {
    // A bare <ul> is a `list` already, but axe's `list` rule does not descend
    // through the role-less <al-menu-item> hosts to find the
    // <li role="listitem"> inside each shadow root, so it reports "list has
    // children that are not listitem" even when the flattened tree is right.
    const el = await fixture<ALMenu>(html`<al-menu label="x"><al-menu-item href="/a">A</al-menu-item></al-menu>`);
    await el.updateComplete;
    expect(el.shadowRoot!.innerHTML).toContain('role="list"');
  });

  it('gives its slotted items listitem role through the FLATTENED tree', async () => {
    // The item is a light-DOM child of <al-menu> while the <ul role="list">
    // lives in al-menu's shadow root — the only path between them is
    // assignedSlot. A parentElement walk would report `none` here.
    const el = await fixture<ALMenu>(html`
      <al-menu label="x"><al-menu-item href="/a">A</al-menu-item></al-menu>
    `);
    await el.updateComplete;
    await tick();
    const item = el.querySelector('al-menu-item')!;
    expect(item.shadowRoot!.querySelector('li,[role]')!.getAttribute('role')).toBe('listitem');
  });

  it('does not claim listitem when the item stands alone', async () => {
    // `listitem` is only legal inside a `list`. An orphan reports `none`.
    const item = await fixture(html`<al-menu-item href="/a">A</al-menu-item>`);
    await (item as any).updateComplete;
    await tick();
    expect(item.shadowRoot!.querySelector('[role]')!.getAttribute('role')).toBe('none');
  });
  it('moves focus between items with the arrow keys and wraps at both ends', async () => {
    // Ported from menu.stories.ts Default, which drove this through
    // `userEvent.keyboard` against whichever element happened to hold focus and
    // then waited up to SIX SECONDS per assertion for `focusedItem` to settle.
    // menu.ts:370-372 dispatches on `e.target instanceof ALMenuItem`, so the
    // event has to originate at the ITEM — that is the contract, and stating it
    // directly removes the need for the timeouts.
    const el = await menuOf(3);
    const all = [...el.querySelectorAll('al-menu-item')] as any[];

    press(all[0], 'ArrowDown');
    await el.updateComplete;
    expect(el.focusedItem).toBe(all[1]);

    press(all[1], 'ArrowUp');
    await el.updateComplete;
    expect(el.focusedItem).toBe(all[0]);

    press(all[0], 'ArrowUp');
    await el.updateComplete;
    expect(el.focusedItem, 'ArrowUp on the first item must wrap to the last').toBe(all[2]);

    press(all[2], 'ArrowDown');
    await el.updateComplete;
    expect(el.focusedItem, 'ArrowDown on the last item must wrap to the first').toBe(all[0]);
  });

  it('sends focus to the first item on Home and the last on End', async () => {
    const el = await menuOf(4);
    const all = [...el.querySelectorAll('al-menu-item')] as any[];

    press(all[1], 'End');
    await el.updateComplete;
    expect(el.focusedItem).toBe(all[3]);

    press(all[3], 'Home');
    await el.updateComplete;
    expect(el.focusedItem).toBe(all[0]);
  });

  it('treats ArrowRight/ArrowLeft as synonyms for Down/Up', async () => {
    // menu.ts:375-382 falls both pairs through to the same branch. A vertical
    // list that ignored the horizontal arrows would still pass an
    // ArrowDown-only test.
    const el = await menuOf(3);
    const all = [...el.querySelectorAll('al-menu-item')] as any[];

    press(all[0], 'ArrowRight');
    await el.updateComplete;
    expect(el.focusedItem).toBe(all[1]);

    press(all[1], 'ArrowLeft');
    await el.updateComplete;
    expect(el.focusedItem).toBe(all[0]);
  });

  it('is ONE tab stop, and the stop follows the focused item', async () => {
    // menu.ts:162-172 records the regression: every item used to be its own tab
    // stop, so Tab and the arrow keys were two competing navigation models and
    // a 20-item menu cost 20 Tab presses to escape. This is the assertion that
    // keeps roving tabindex from being undone.
    const el = await menuOf(3);
    const all = [...el.querySelectorAll('al-menu-item')] as any[];
    const stops = () => all.map((i) => i.menuItemFocusable?.tabIndex);

    expect(stops()).toEqual([0, -1, -1]);

    press(all[0], 'ArrowDown');
    await el.updateComplete;
    expect(stops(), 'the single tab stop must move with focus').toEqual([-1, 0, -1]);
  });

  it('keeps exactly one item selected as the selection moves', async () => {
    // Ported from menu.stories.ts Default. menu.ts:405-408 — the menu listens
    // for the bubbled onMenuItemSelect and clears the previous item.
    const el = await menuOf(3);
    const all = [...el.querySelectorAll('al-menu-item')] as any[];

    all[0].setSelected();
    await el.updateComplete;
    expect(el.selectedItem).toBe(all[0]);

    all[1].setSelected();
    await el.updateComplete;
    expect(el.selectedItem).toBe(all[1]);
    expect(all[0].isSelected, 'the previous selection must be cleared').toBe(false);
  });

  it('never selects a disabled item', async () => {
    // The story clicked a disabled item and asserted `selectedItem` was
    // undefined — worth keeping, but it proved it via al-menu, where the
    // guard actually lives in menu-item.ts:334.
    const el = await menuOf(3);
    const all = [...el.querySelectorAll('al-menu-item')] as any[];
    all[1].isDisabled = true;
    await el.updateComplete;

    all[1].setSelected();
    await el.updateComplete;
    expect(all[1].isSelected).toBeFalsy();
    expect(el.selectedItem).toBeUndefined();
  });

  it('hides a collapsed group and takes its items out of arrow navigation', async () => {
    // Ported from menu.stories.ts WithGroups, which only asserted `isHidden`.
    // The half it missed is menu.ts:184 — a hidden item also has `idx === null`
    // and is skipped by getNewValidItem, so arrowing past a collapsed group
    // must NOT land inside it. Hiding without de-indexing would move focus to
    // an invisible element.
    const el = await fixture<ALMenu>(html`
      <al-menu label="Account">
        <al-menu-item href="/top">Top</al-menu-item>
        <al-menu-item isHeader isExpandableHeader>Group</al-menu-item>
        <al-menu-item href="/g1">G1</al-menu-item>
        <al-menu-item href="/g2">G2</al-menu-item>
      </al-menu>
    `);
    await el.updateComplete;
    await tick();
    const all = [...el.querySelectorAll('al-menu-item')] as any[];
    const [top, header, g1, g2] = all;

    // Collapsed by default.
    expect([g1.isHidden, g2.isHidden]).toEqual([true, true]);
    expect([g1.idx, g2.idx], 'hidden items must be unreachable by index').toEqual([null, null]);

    press(top, 'ArrowDown');
    await el.updateComplete;
    expect(el.focusedItem).toBe(header);
    press(header, 'ArrowDown');
    await el.updateComplete;
    expect(el.focusedItem, 'arrowing past a collapsed group must skip its items').toBe(top);

    header.toggleExpanded();
    await el.updateComplete;
    await tick();
    expect([g1.isHidden, g2.isHidden]).toEqual([false, false]);
    expect([g1.idx, g2.idx]).toEqual([2, 3]);
  });
});
