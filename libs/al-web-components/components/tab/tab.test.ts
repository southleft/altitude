import { fixture, html } from '@open-wc/testing-helpers';
import { userEvent } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import './tab';
import type { ALTab } from './tab';

const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));
// tab.ts:82-84 recomputes the role in a requestAnimationFrame, because
// <al-tabs> may not have rendered its tablist yet when the tab first updates.
const frames = (n = 3) =>
  new Promise<void>((resolve) => {
    let left = n;
    const step = () => (left-- > 0 ? requestAnimationFrame(step) : resolve());
    step();
  });

const button = (el: ALTab) => el.shadowRoot!.querySelector('button.al-c-tab') as HTMLButtonElement;

describe('al-tab', () => {
  it('announces a selection request instead of activating itself', async () => {
    // Ported from tab.stories.ts Selected — where the assertion was vacuous.
    // That story sets `isActive: true` in its args (tab.stories.ts:36-38), so
    // `expect(tab.isActive).toBe(true)` after the click was already true before
    // it and would have passed against a tab that handled no clicks at all.
    //
    // The real contract (tab.ts:95-102): a tab OWNS NO SELECTION STATE. It
    // dispatches onTabSelect and <al-tabs> decides. Starting from inactive is
    // what makes that visible.
    const el = await fixture<ALTab>(html`<al-tab>One</al-tab>`);
    await el.updateComplete;
    const seen: unknown[] = [];
    el.addEventListener('onTabSelect', (e) => seen.push((e as CustomEvent).detail));

    await userEvent.click(button(el));
    await el.updateComplete;

    expect(seen).toEqual([{ value: el, index: 0 }]);
    expect(el.isActive, 'a lone tab must not self-activate — al-tabs owns that').toBeFalsy();
  });

  it('carries its index in the event so the owner can identify it', async () => {
    const el = await fixture<ALTab>(html`<al-tab .idx=${3}>Four</al-tab>`);
    await el.updateComplete;
    const seen: number[] = [];
    el.addEventListener('onTabSelect', (e) => seen.push((e as CustomEvent).detail.index));

    await userEvent.click(button(el));
    expect(seen).toEqual([3]);
  });

  it('renders the active state as a class and a real tab stop', async () => {
    const active = await fixture<ALTab>(html`<al-tab isActive>One</al-tab>`);
    await active.updateComplete;
    expect(button(active).className).toContain('al-is-active');
    expect(button(active).getAttribute('tabindex')).toBe('0');

    const inactive = await fixture<ALTab>(html`<al-tab>Two</al-tab>`);
    await inactive.updateComplete;
    expect(button(inactive).className).not.toContain('al-is-active');
    // Roving tabindex: only the active tab is in the tab order.
    expect(button(inactive).getAttribute('tabindex')).toBe('-1');
  });

  it('does not claim role="tab" or aria-selected when it has no tablist owner', async () => {
    // tab.ts:61-79 — `tab` requires a `tablist` ancestor. Standalone (which is
    // exactly what the Atoms/Navigation/Tab stories render) a hardcoded
    // role="tab" makes axe report aria-required-parent, so the role falls back
    // to the <button>'s implicit one and aria-selected is dropped with it.
    const el = await fixture<ALTab>(html`<al-tab isActive>Lonely</al-tab>`);
    await el.updateComplete;
    await tick();
    await frames();

    expect(button(el).hasAttribute('role')).toBe(false);
    expect(
      button(el).hasAttribute('aria-selected'),
      'aria-selected is meaningless without role=tab and axe flags it'
    ).toBe(false);
  });

  it('emits nothing and refuses focus when disabled', async () => {
    const el = await fixture<ALTab>(html`<al-tab isDisabled>Nope</al-tab>`);
    await el.updateComplete;
    expect(button(el).disabled).toBe(true);
    expect(button(el).className).toContain('al-is-disabled');

    let fired = 0;
    el.addEventListener('onTabSelect', () => fired++);
    button(el).click();
    await el.updateComplete;
    expect(fired).toBe(0);
  });
});
