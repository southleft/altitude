import { fixture, html } from '@open-wc/testing-helpers';
import { userEvent } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import './tooltip';
import '../button/button';
import type { ALTooltip } from './tooltip';

const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const trigger = (el: ALTooltip) => el.shadowRoot!.querySelector('.al-c-tooltip__trigger') as HTMLElement;
const panel = (el: ALTooltip) => el.shadowRoot!.querySelector('.al-c-tooltip__container') as HTMLElement;

const simple = async () => {
  const el = await fixture<ALTooltip>(html`
    <al-tooltip><span slot="trigger">?</span>More information</al-tooltip>
  `);
  await el.updateComplete;
  await tick();
  return el;
};

/**
 * Keydown handling lives on the tooltip's root wrapper (tooltip.ts:343), so a
 * key press only reaches it if it is `composed` - a plain non-composed event
 * dispatched inside the shadow root never crosses back out to that listener.
 */
const press = (el: ALTooltip, code: string) =>
  trigger(el).dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, composed: true }));

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
  it('opens on hover and closes again when the pointer leaves', async () => {
    // Ported from tooltip.stories.ts Default and PositionDynamic (which hovered
    // four differently positioned tooltips and asserted the same one thing
    // about each). tooltip.ts:127-128 binds mouseover/mouseout on the HOST, not
    // on the trigger, so the listener sees the retargeted event.
    const el = await simple();
    expect(el.isActive).toBeFalsy();

    await userEvent.hover(trigger(el));
    await el.updateComplete;
    expect(el.isActive).toBe(true);
    expect(panel(el).getAttribute('aria-hidden')).toBe('false');

    await userEvent.unhover(trigger(el));
    await el.updateComplete;
    expect(el.isActive).toBe(false);
    expect(panel(el).getAttribute('aria-hidden')).toBe('true');
  });

  it('opens on focus, so the tooltip is reachable without a pointer', async () => {
    // tooltip.ts:273-277. Hover-only is the classic WCAG 1.4.13 failure; this
    // is the assertion none of the three play functions made.
    const el = await simple();
    trigger(el).focus();
    await el.updateComplete;
    expect(el.isActive).toBe(true);
  });

  it('toggles on click', async () => {
    // Ported from tooltip.stories.ts VisibleOnClick, which clicked three times.
    const el = await simple();
    expect(el.isActive, 'starts undefined, not false - the property is never initialised').toBeUndefined();

    trigger(el).click();
    await el.updateComplete;
    expect(el.isActive).toBe(true);

    trigger(el).click();
    await el.updateComplete;
    expect(el.isActive).toBe(false);
  });

  it('toggles on Enter and on Space', async () => {
    for (const code of ['Enter', 'Space']) {
      const el = await simple();
      press(el, code);
      await el.updateComplete;
      expect(el.isActive, `${code} opens`).toBe(true);

      press(el, code);
      await el.updateComplete;
      expect(el.isActive, `${code} closes`).toBe(false);
    }
  });

  it('closes on Escape and on Tab, but only while it is open', async () => {
    // tooltip.ts:239-242 - Tab dismisses because focus is leaving the trigger,
    // and the guard on `isActive` keeps a stray Escape elsewhere on the page
    // from firing a spurious onTooltipClose.
    for (const code of ['Escape', 'Tab']) {
      const el = await simple();
      let closes = 0;
      el.addEventListener('onTooltipClose', () => closes++);

      press(el, code);
      await el.updateComplete;
      expect(closes, `${code} while closed must be inert`).toBe(0);

      el.open();
      await el.updateComplete;
      press(el, code);
      await el.updateComplete;
      expect(el.isActive, `${code} closes an open tooltip`).toBe(false);
      expect(closes).toBe(1);
    }
  });

  it('ignores hover and focus entirely when it is interactive', async () => {
    // tooltip.ts:253-277 - an interactive tooltip holds content the user has to
    // be able to move the pointer INTO, so the hover-out that would normally
    // dismiss it has to be disabled along with the hover-in.
    const el = await fixture<ALTooltip>(html`
      <al-tooltip isInteractive><span slot="trigger">?</span>More information</al-tooltip>
    `);
    await el.updateComplete;
    await tick();

    await userEvent.hover(trigger(el));
    await el.updateComplete;
    expect(el.isActive).toBeFalsy();

    trigger(el).focus();
    await el.updateComplete;
    expect(el.isActive).toBeFalsy();

    // Click still works - that is how an interactive tooltip is opened.
    trigger(el).click();
    await el.updateComplete;
    expect(el.isActive).toBe(true);
  });

  it('closes when a mousedown lands outside it', async () => {
    const el = await simple();
    el.open();
    await el.updateComplete;

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }));
    await el.updateComplete;
    expect(el.isActive).toBe(false);
  });

  it('keeps the panel out of the layout while closed, not just out of the a11y tree', async () => {
    // tooltip.ts:356 sets `display: none` alongside aria-hidden. A panel that
    // was only aria-hidden would still occupy space and still be hit-testable.
    // Driven explicitly rather than read off a fresh mount: a preceding test
    // leaves Playwright's cursor parked where it last hovered, the new fixture
    // mounts under it, and the tooltip legitimately opens on that real
    // mouseover. Asserting both directions from a known state is
    // order-independent and covers the same branch.
    const el = await simple();
    el.open();
    await el.updateComplete;
    expect(panel(el).getAttribute('style')).not.toContain('display: none');

    el.close();
    await el.updateComplete;
    expect(panel(el).getAttribute('style')).toContain('display: none');
  });

  it('stops listening for outside clicks once it is removed from the document', async () => {
    // tooltip.ts:126/139 add and remove a listener on `globalThis` - a missed
    // removal leaks one listener per mount.
    const el = await simple();
    el.open();
    await el.updateComplete;
    el.remove();

    let closes = 0;
    el.addEventListener('onTooltipClose', () => closes++);
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }));
    await tick();
    expect(closes).toBe(0);
  });
});
