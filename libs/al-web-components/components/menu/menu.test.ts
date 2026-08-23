import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import './menu';
import '../menu-item/menu-item';
import '../list/list';
import '../list-item/list-item';
import type { ALMenu } from './menu';

const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

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
});
