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

/**
 * Fire a keydown AT a tab.
 *
 * tabs.ts:285-288 requires BOTH that `e.target` is the ALTab and that
 * `document.activeElement` is one - so the tab has to really hold focus, not
 * merely receive a synthetic event. Focusing the inner <button> retargets
 * document.activeElement to the <al-tab> host, which is what the guard reads.
 */
const pressOn = async (tab: any, key: string) => {
  (tab.shadowRoot.querySelector('.al-c-tab') as HTMLElement).focus();
  tab.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true }));
};

const manyTabs = () => fixture<ALTabs>(html`
  <al-tabs style="width: 120px">
    ${Array.from({ length: 9 }, (_, i) => html`<al-tab>Tab number ${i}</al-tab>`)}
    ${Array.from({ length: 9 }, (_, i) => html`<al-tab-panel slot="panel">Panel ${i}</al-tab-panel>`)}
  </al-tabs>
`);

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
  it('moves the active tab with ArrowRight/ArrowLeft and wraps at both ends', async () => {
    // Ported from tabs.stories.ts WithActiveIndex. That play function sent
    // every key from `firstTab` regardless of what was actually active, so it
    // never really proved the walk is relative to the CURRENT tab. Here each
    // press comes from the tab that holds focus.
    const el = await manyTabs();
    await el.updateComplete;
    await tick();
    await frames();
    const tabs = [...el.querySelectorAll('al-tab')] as any[];

    (tabs[0].shadowRoot.querySelector('.al-c-tab') as HTMLElement).click();
    await el.updateComplete;
    await tick();
    expect(tabs[0].isActive).toBe(true);

    await pressOn(tabs[0], 'ArrowRight');
    await el.updateComplete;
    await tick();
    expect(tabs[1].isActive).toBe(true);
    expect(tabs[0].isActive, 'only one tab may be active').toBe(false);

    await pressOn(tabs[1], 'ArrowLeft');
    await el.updateComplete;
    await tick();
    expect(tabs[0].isActive).toBe(true);

    await pressOn(tabs[0], 'ArrowLeft');
    await el.updateComplete;
    await tick();
    expect(tabs[8].isActive, 'ArrowLeft on the first tab must wrap to the last').toBe(true);

    await pressOn(tabs[8], 'ArrowRight');
    await el.updateComplete;
    await tick();
    expect(tabs[0].isActive, 'ArrowRight on the last tab must wrap to the first').toBe(true);
  });

  it('jumps to the last tab on End and the first on Home', async () => {
    const el = await manyTabs();
    await el.updateComplete;
    await tick();
    await frames();
    const tabs = [...el.querySelectorAll('al-tab')] as any[];

    await pressOn(tabs[0], 'End');
    await el.updateComplete;
    await tick();
    expect(tabs[8].isActive).toBe(true);

    await pressOn(tabs[8], 'Home');
    await el.updateComplete;
    await tick();
    expect(tabs[0].isActive).toBe(true);
  });

  it('skips a disabled tab when arrowing past it', async () => {
    // tabs.ts:347-356 - the `while (isDisabled)` loop. Landing on a disabled
    // tab would show its panel while its control cannot be operated.
    const el = await fixture<ALTabs>(html`
      <al-tabs>
        <al-tab>One</al-tab>
        <al-tab isDisabled>Two</al-tab>
        <al-tab>Three</al-tab>
        <al-tab-panel slot="panel">1</al-tab-panel>
        <al-tab-panel slot="panel">2</al-tab-panel>
        <al-tab-panel slot="panel">3</al-tab-panel>
      </al-tabs>
    `);
    await el.updateComplete;
    await tick();
    await frames();
    const tabs = [...el.querySelectorAll('al-tab')] as any[];

    await pressOn(tabs[0], 'ArrowRight');
    await el.updateComplete;
    await tick();
    expect(tabs[2].isActive, 'the disabled tab must be stepped over').toBe(true);
    expect(tabs[1].isActive).toBeFalsy();
  });

  it('reports the new tab index through onTabsChange', async () => {
    const el = await manyTabs();
    await el.updateComplete;
    await tick();
    await frames();
    const tabs = [...el.querySelectorAll('al-tab')] as any[];
    const seen: unknown[] = [];
    el.addEventListener('onTabsChange', (e) => seen.push((e as CustomEvent).detail.activeTabIdx));

    await pressOn(tabs[0], 'ArrowRight');
    await el.updateComplete;
    await tick();
    expect(seen.at(-1)).toBe(1);
  });

  it('shows scroll arrows only when the tab list actually overflows', async () => {
    // Ported from tabs.stories.ts WithScroll. tabs.ts:242-250 compares
    // scrollWidth against clientWidth - which is exactly why these tests run in
    // a real browser: under a DOM shim both are 0, `isScrollable` is always
    // false, the arrows silently never render, and the test is still green.
    const narrow = await manyTabs();
    await narrow.updateComplete;
    await tick();
    await frames();
    expect(narrow.isScrollable).toBe(true);
    expect(narrow.shadowRoot!.querySelectorAll('.al-c-tabs__arrow')).toHaveLength(2);
    expect(narrow.shadowRoot!.querySelector('.al-c-tabs')!.className).toContain('al-is-scrollable');

    const roomy = await twoTabs();
    await roomy.updateComplete;
    await tick();
    await frames();
    expect(roomy.isScrollable).toBe(false);
    expect(roomy.shadowRoot!.querySelectorAll('.al-c-tabs__arrow')).toHaveLength(0);
  });

  it('steps the active tab forwards and backwards from the scroll arrows', async () => {
    const el = await manyTabs();
    await el.updateComplete;
    await tick();
    await frames();
    const tabs = [...el.querySelectorAll('al-tab')] as any[];
    const [prev, next] = [...el.shadowRoot!.querySelectorAll('.al-c-tabs__arrow')] as any[];

    expect(tabs[0].isActive).toBe(true);

    next.shadowRoot.querySelector('button').click();
    await el.updateComplete;
    await tick();
    expect(tabs[1].isActive).toBe(true);

    prev.shadowRoot.querySelector('button').click();
    await el.updateComplete;
    await tick();
    expect(tabs[0].isActive).toBe(true);
  });

  it('gives each scroll arrow a correct accessible name', async () => {
    // Two bugs sat here and had to move together, which is why the earlier
    // pinned test asserted both halves at once.
    //
    // 1. Both arrows rendered `aria-label=""`. button.ts:153 derived its
    //    fallback from the FIRST text node, and the arrow templates put the
    //    icon on its own line, so that node was whitespace and trimmed to ''.
    //    Fixed generally in button.ts (first NON-EMPTY text node) and belt-and
    //    -braces here with an explicit `label`, which is what the icon-only
    //    pattern documents anyway: set hideText, supply label.
    // 2. The text was SWAPPED — the prev arrow said "Next" and the next arrow
    //    said "Previous". Fixing the derivation alone would have turned "no
    //    name" into a confidently wrong one, which is worse.
    //
    // Never caught before because tabs.stories.ts WithScroll clicked the arrows
    // by array INDEX and never read a name.
    const el = await manyTabs();
    await el.updateComplete;
    await tick();
    await frames();
    const [prev, next] = [...el.shadowRoot!.querySelectorAll('.al-c-tabs__arrow')] as any[];
    await tick(80);
    await prev.updateComplete;
    await next.updateComplete;

    expect(prev.className).toContain('al-c-tabs__arrow--prev');
    expect(next.className).toContain('al-c-tabs__arrow--next');

    expect(prev.shadowRoot.querySelector('button').getAttribute('aria-label')).toBe('Previous');
    expect(next.shadowRoot.querySelector('button').getAttribute('aria-label')).toBe('Next');

    // The visible text must agree with the name, or the two disagree for
    // anyone who turns hideText off.
    expect(prev.textContent.trim()).toBe('Previous');
    expect(next.textContent.trim()).toBe('Next');
  });
});
