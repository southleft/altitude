import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import './drawer';
import type { ALDrawer } from './drawer';

const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const container = (el: ALDrawer) => el.shadowRoot!.querySelector('.al-c-drawer__container') as HTMLElement;

describe('al-drawer', () => {
  it('is a modal dialog when it has a backdrop', async () => {
    // drawer.ts:308-318 — with a backdrop the drawer covers the page, so it is
    // a modal. It used to be role="region" with no aria-modal and no trap, and
    // Tab walked straight out behind the backdrop.
    const el = await fixture<ALDrawer>(html`<al-drawer hasBackdrop><p>Body</p></al-drawer>`);
    await el.updateComplete;
    expect(container(el).getAttribute('role')).toBe('dialog');
    expect(container(el).getAttribute('aria-modal')).toBe('false');

    el.open();
    await el.updateComplete;
    expect(container(el).getAttribute('aria-modal')).toBe('true');
  });

  it('stays a plain region when it has no backdrop, and claims no modality', async () => {
    const el = await fixture<ALDrawer>(html`<al-drawer><p>Body</p></al-drawer>`);
    await el.updateComplete;
    expect(container(el).getAttribute('role')).toBe('region');
    expect(container(el).hasAttribute('aria-modal'), 'a non-blocking panel must not claim aria-modal').toBe(false);
  });

  it('wraps a modal drawer in a focus trap and a non-modal one not at all', async () => {
    const modal = await fixture<ALDrawer>(html`<al-drawer hasBackdrop><p>Body</p></al-drawer>`);
    await modal.updateComplete;
    expect(modal.shadowRoot!.querySelector('al-focus-trap')).not.toBeNull();

    const panel = await fixture<ALDrawer>(html`<al-drawer><p>Body</p></al-drawer>`);
    await panel.updateComplete;
    expect(panel.shadowRoot!.querySelector('al-focus-trap')).toBeNull();
  });

  it('keeps the closed drawer out of the tab order and the a11y tree', async () => {
    const el = await fixture<ALDrawer>(html`<al-drawer hasBackdrop><button>Inside</button></al-drawer>`);
    await el.updateComplete;
    expect(container(el).hasAttribute('inert')).toBe(true);
    expect(container(el).getAttribute('aria-hidden')).toBe('true');

    el.open();
    await el.updateComplete;
    expect(container(el).hasAttribute('inert')).toBe(false);
    expect(container(el).getAttribute('aria-hidden')).toBe('false');
  });

  it('makes the rest of the page inert while open and restores it on close', async () => {
    const outside = document.createElement('div');
    outside.id = 'al-test-drawer-outside';
    document.body.append(outside);
    try {
      const el = await fixture<ALDrawer>(html`<al-drawer hasBackdrop><p>Body</p></al-drawer>`);
      await el.updateComplete;
      el.open();
      await el.updateComplete;
      expect(outside.hasAttribute('inert')).toBe(true);

      el.close();
      await el.updateComplete;
      expect(outside.hasAttribute('inert')).toBe(false);
    } finally {
      outside.remove();
    }
  });

  it('labels the drawer only when there is a header to label it with', async () => {
    const bare = await fixture<ALDrawer>(html`<al-drawer hasBackdrop><p>Body</p></al-drawer>`);
    await bare.updateComplete;
    expect(container(bare).hasAttribute('aria-labelledby'), 'a dangling IDREF is worse than none').toBe(false);

    const titled = await fixture<ALDrawer>(html`
      <al-drawer hasBackdrop><span slot="header">Filters</span><p>Body</p></al-drawer>
    `);
    await titled.updateComplete;
    const labelledBy = container(titled).getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    const target = titled.shadowRoot!.querySelector(`[id="${labelledBy}"]`);
    expect(target).not.toBeNull();
    // The labelled node holds the header slot; the visible text is projected
    // light DOM, so read it through the slot assignment rather than textContent.
    const slot = target!.querySelector('slot[name="header"]') as HTMLSlotElement;
    expect(slot.assignedElements().map((n) => n.textContent)).toEqual(['Filters']);
  });

  it('reports opening and closing through its events', async () => {
    const el = await fixture<ALDrawer>(html`<al-drawer hasBackdrop><p>Body</p></al-drawer>`);
    const seen: string[] = [];
    el.addEventListener('onDrawerOpen', () => seen.push('open'));
    el.addEventListener('onDrawerClose', () => seen.push('close'));

    el.open();
    await el.updateComplete;
    el.close();
    await el.updateComplete;
    await tick();
    expect(seen).toEqual(['open', 'close']);
  });
});
