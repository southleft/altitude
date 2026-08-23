import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import './tabs';
import '../tab/tab';
import '../tab-panel/tab-panel';
import type { ALTabs } from './tabs';

const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));
// tab.ts:82-84 recomputes the role in a requestAnimationFrame, because
// <al-tabs> may not have rendered its tablist yet when the tab first updates.
const frames = (n = 3) =>
  new Promise<void>((resolve) => {
    let left = n;
    const step = () => (left-- > 0 ? requestAnimationFrame(step) : resolve());
    step();
  });

const twoTabs = () => fixture<ALTabs>(html`
  <al-tabs>
    <al-tab>One</al-tab>
    <al-tab>Two</al-tab>
    <al-tab-panel slot="panel">First panel</al-tab-panel>
    <al-tab-panel slot="panel">Second panel</al-tab-panel>
  </al-tabs>
`);

describe('al-tabs', () => {
  it('renders a real tablist', async () => {
    const el = await twoTabs();
    await el.updateComplete;
    await tick();
    await frames();
    expect(el.shadowRoot!.querySelector('[role="tablist"]')).not.toBeNull();
  });

  it('gives each tab the tab role only because a tablist is its flattened ancestor', async () => {
    // tab.ts:65-79. Rendered standalone, `role="tab"` has no required parent
    // and axe reports aria-required-parent, so the role is context-gated.
    const el = await twoTabs();
    await el.updateComplete;
    await tick();
    await frames();
    for (const tab of el.querySelectorAll('al-tab')) {
      expect(tab.shadowRoot!.querySelector('[role]')!.getAttribute('role')).toBe('tab');
    }

    const orphan = await fixture(html`<al-tab>Lonely</al-tab>`);
    await (orphan as any).updateComplete;
    await tick();
    await frames();
    expect(orphan.shadowRoot!.querySelector('[role="tab"]')).toBeNull();
  });

  it('carries selection through aria-selected, and deliberately renders no aria-controls', async () => {
    // tab.ts:42-53 — the panel's id lives inside <al-tab-panel>'s shadow root
    // while the tab's <button> lives inside <al-tab>'s, and an IDREF cannot
    // cross a shadow boundary: axe reported every value as
    // aria-valid-attr-value. `aria-controls` is a SHOULD for role=tab, not a
    // MUST, so the state travels on aria-selected instead. Pinned here so a
    // future "fix" that re-adds a cross-root IDREF is caught.
    const el = await twoTabs();
    await el.updateComplete;
    await tick();
    await frames();

    const buttons = [...el.querySelectorAll('al-tab')].map(
      (t) => t.shadowRoot!.querySelector('[role="tab"]') as HTMLElement
    );
    expect(buttons).toHaveLength(2);
    for (const b of buttons) expect(b.hasAttribute('aria-controls')).toBe(false);

    expect(buttons.map((b) => b.getAttribute('aria-selected'))).toEqual(['true', 'false']);
    expect(buttons.map((b) => b.getAttribute('tabindex'))).toEqual(['0', '-1']);

    (buttons[1] as HTMLButtonElement).click();
    await el.updateComplete;
    await tick();
    expect(buttons.map((b) => b.getAttribute('aria-selected'))).toEqual(['false', 'true']);
    expect(buttons.map((b) => b.getAttribute('tabindex'))).toEqual(['-1', '0']);
  });

  it('leaves the aria-controls value undefined for a tab that has no panel', async () => {
    // tabs.ts:144-150 — a tab with no matching panel used to be assigned a
    // generated id that was never rendered anywhere.
    const el = await fixture<ALTabs>(html`
      <al-tabs>
        <al-tab>One</al-tab>
        <al-tab>Orphan</al-tab>
        <al-tab-panel slot="panel">Only panel</al-tab-panel>
      </al-tabs>
    `);
    await el.updateComplete;
    await tick();
    await frames();

    const tabs = [...el.querySelectorAll('al-tab')] as any[];
    expect(tabs[0].ariaControls).toBeTruthy();
    expect(tabs[1].ariaControls, 'the panel-less tab must not name a phantom id').toBeUndefined();
    expect(tabs[1].shadowRoot.querySelector('[role="tab"]').hasAttribute('aria-controls')).toBe(false);
  });

  it('labels each panel with the tab that controls it', async () => {
    const el = await twoTabs();
    await el.updateComplete;
    await tick();
    await frames();
    const tabs = [...el.querySelectorAll('al-tab')] as any[];
    const panels = [...el.querySelectorAll('al-tab-panel')] as any[];

    for (let i = 0; i < panels.length; i++) {
      expect(panels[i].ariaLabelledBy).toBe(tabs[i].ariaId);
      expect(panels[i].ariaLabelledBy).toBeTruthy();
    }
  });
});
