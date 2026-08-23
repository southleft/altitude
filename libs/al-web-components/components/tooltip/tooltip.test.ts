import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import './tooltip';
import '../button/button';
import type { ALTooltip } from './tooltip';

const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const trigger = (el: ALTooltip) => el.shadowRoot!.querySelector('.al-c-tooltip__trigger') as HTMLElement;
const panel = (el: ALTooltip) => el.shadowRoot!.querySelector('.al-c-tooltip__container') as HTMLElement;

describe('al-tooltip', () => {
  it('describes its own trigger with an id that resolves inside the same root', async () => {
    const el = await fixture<ALTooltip>(html`
      <al-tooltip><span slot="trigger">?</span>More information</al-tooltip>
    `);
    await el.updateComplete;
    await tick();

    const describedBy = trigger(el).getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(panel(el).id).toBe(describedBy);
    expect(panel(el).getAttribute('role')).toBe('tooltip');
    // Both ends of the IDREF are in the SAME shadow root, which is the only
    // way an IDREF can resolve at all.
    expect(trigger(el).getRootNode()).toBe(panel(el).getRootNode());
  });

  it('gives a non-focusable slotted trigger a tab stop', async () => {
    const el = await fixture<ALTooltip>(html`
      <al-tooltip><span slot="trigger">?</span>More information</al-tooltip>
    `);
    await el.updateComplete;
    await tick();
    expect(trigger(el).getAttribute('tabindex')).toBe('0');
  });

  it('does NOT add a second tab stop when the slotted trigger is already focusable', async () => {
    // tooltip.ts:158-171 — the wrapper used to be unconditionally
    // tabindex="0", so `<al-button slot="trigger">` produced two tab stops for
    // one control.
    const el = await fixture<ALTooltip>(html`
      <al-tooltip><al-button slot="trigger">Help</al-button>More information</al-tooltip>
    `);
    await el.updateComplete;
    await tick();
    expect(trigger(el).hasAttribute('tabindex')).toBe(false);
  });

  it('hides the panel from the accessibility tree until it is shown', async () => {
    const el = await fixture<ALTooltip>(html`
      <al-tooltip><span slot="trigger">?</span>More information</al-tooltip>
    `);
    await el.updateComplete;
    await tick();
    expect(panel(el).getAttribute('aria-hidden')).toBe('true');

    trigger(el).click();
    await el.updateComplete;
    expect(panel(el).getAttribute('aria-hidden')).toBe('false');
  });

  it('KNOWN LIMITATION: the IDREF cannot reach a slotted focusable trigger', async () => {
    // Stated in the a11y commit as partial and not solved: aria-describedby is
    // on the tooltip's OWN wrapper, and an IDREF cannot cross a shadow
    // boundary, so the <al-button>'s inner <button> - the thing that actually
    // takes focus - is not described. This test exists so the day someone
    // solves it, they are told which assertion to update, rather than the gap
    // living only in a commit message.
    const el = await fixture<ALTooltip>(html`
      <al-tooltip><al-button slot="trigger">Help</al-button>More information</al-tooltip>
    `);
    await el.updateComplete;
    await tick();
    const focusable = el.querySelector('al-button')!.shadowRoot!.querySelector('button')!;
    expect(
      focusable.getAttribute('aria-describedby'),
      'if this is no longer null the limitation was fixed - update this test'
    ).toBeNull();
  });
});
