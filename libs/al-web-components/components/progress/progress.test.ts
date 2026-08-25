import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import './progress';
import type { ALProgress } from './progress';

const bar = (el: ALProgress) => el.shadowRoot!.querySelector('[role="progressbar"]') as HTMLElement;
const label = (el: ALProgress) => el.shadowRoot!.querySelector('.al-c-progress__label') as HTMLElement;
const fill = (el: ALProgress) => el.shadowRoot!.querySelector('.al-c-progress__fill') as HTMLElement;

describe('al-progress', () => {
  // progress.stories.ts has 22 `play` functions and NOT ONE ASSERTION between
  // them — every one just calls `updateProgress()`, a setInterval that drives
  // `change()` so the Storybook snapshot has something moving in it. They are
  // animation drivers, not tests. What they exercised without ever checking is
  // `change()`, so that is what is pinned here.

  it('advances currentProgress by the requested delta and stops at endProgress', async () => {
    const el = await fixture<ALProgress>(html`<al-progress .currentProgress=${0} .endProgress=${100}></al-progress>`);
    await el.updateComplete;

    el.change(10);
    expect(el.currentProgress).toBe(10);

    el.change(10);
    expect(el.currentProgress).toBe(20);

    // Run past the end. `change()` guards on `currentProgress < endProgress`,
    // so the last step lands exactly on 100 and every later call is a no-op —
    // the interval in the stories relied on that to terminate itself.
    for (let i = 0; i < 20; i++) el.change(10);
    expect(el.currentProgress).toBe(100);
  });

  it('counts DOWN when endProgress is below the starting value', async () => {
    // progress.ts:246 derives `isReversed` in firstUpdated from the initial
    // values — there is no `reversed` prop. A caller that set the properties
    // AFTER first render would silently get a forward bar.
    const el = await fixture<ALProgress>(html`<al-progress .currentProgress=${100} .endProgress=${0}></al-progress>`);
    await el.updateComplete;

    el.change(-10);
    expect(el.currentProgress).toBe(90);

    for (let i = 0; i < 20; i++) el.change(-10);
    expect(el.currentProgress).toBe(0);
  });

  it('publishes the current value on the progressbar role for assistive technology', async () => {
    // The visible label is opt-in (`showLabel`), so aria-valuenow is the only
    // thing a screen reader has. It has to track `change()`, not just the
    // initial render.
    const el = await fixture<ALProgress>(html`<al-progress .currentProgress=${0} .endProgress=${100}></al-progress>`);
    await el.updateComplete;
    expect(bar(el).getAttribute('aria-valuenow')).toBe('0');
    expect(bar(el).getAttribute('aria-label')).toBe('progress');

    el.change(25);
    await el.updateComplete;
    expect(bar(el).getAttribute('aria-valuenow')).toBe('25');
  });

  it('renders the percentage label by default and a ratio when labelType is set', async () => {
    const pct = await fixture<ALProgress>(html`<al-progress showLabel .currentProgress=${0} .endProgress=${200}></al-progress>`);
    await pct.updateComplete;
    pct.change(50);
    await pct.updateComplete;
    expect(label(pct).textContent!.trim()).toBe('25%');

    const ratio = await fixture<ALProgress>(
      html`<al-progress showLabel labelType="ratio" .currentProgress=${0} .endProgress=${200}></al-progress>`
    );
    await ratio.updateComplete;
    ratio.change(50);
    await ratio.updateComplete;
    expect(label(ratio).textContent!.trim()).toBe('50 / 200');
  });

  it('keeps the label in the accessibility tree when showLabel is off', async () => {
    // The label node is rendered either way and only visually hidden —
    // dropping it entirely would take the text out of the a11y tree.
    const el = await fixture<ALProgress>(html`<al-progress .currentProgress=${10} .endProgress=${100}></al-progress>`);
    await el.updateComplete;
    expect(label(el)).not.toBeNull();
    expect(label(el).className).toContain('al-is-u-vishidden');
    expect(el.shadowRoot!.querySelector('.al-c-progress')!.className).not.toContain('al-has-label');
  });

  it('drives the bar width from the percentage, not the raw value', async () => {
    const el = await fixture<ALProgress>(html`<al-progress .currentProgress=${0} .endProgress=${50}></al-progress>`);
    await el.updateComplete;
    el.change(25);
    await el.updateComplete;
    expect(fill(el).getAttribute('style')).toContain('width: 50%');
  });

  it('reports the rendered label with every onProgressChange', async () => {
    // progress.ts:288-294 — the label travels in the event so a sibling
    // component can display it without reaching into this shadow root.
    const el = await fixture<ALProgress>(html`<al-progress .currentProgress=${0} .endProgress=${100}></al-progress>`);
    await el.updateComplete;
    const seen: unknown[] = [];
    el.addEventListener('onProgressChange', (e) => seen.push((e as CustomEvent).detail.label));

    el.change(40);
    el.change(10);
    expect(seen).toEqual(['40%', '50%']);
  });

  it('renders an svg circle instead of a bar when isCircle is set', async () => {
    const el = await fixture<ALProgress>(html`<al-progress isCircle .currentProgress=${0} .endProgress=${100}></al-progress>`);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.al-c-progress__fill--circle circle')).not.toBeNull();
    expect(fill(el), 'the linear bar must not also render').toBeNull();
  });
});
