import { fixture, html } from '@open-wc/testing-helpers';
import { userEvent } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import './popover';
import '../button/button';
import type { ALPopover } from './popover';

const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const container = (el: ALPopover) => el.shadowRoot!.querySelector('.al-c-popover__container') as HTMLElement;
const closeButton = (el: ALPopover) => el.shadowRoot!.querySelector('.al-c-popover__close-button') as HTMLElement;
// The slotted trigger sits in the LIGHT dom; the @click that opens the popover
// is on the shadow-root wrapper the slot lives in, so either node works for a
// pointer click — but the wrapper is what actually has the handler.
const triggerWrapper = (el: ALPopover) => el.shadowRoot!.querySelector('.al-c-popover__trigger') as HTMLElement;

const withTrigger = async (extra = '') => {
  const el = await fixture<ALPopover>(html`
    <al-popover heading="Options" .transitionDelay=${0} ?isDismissible=${extra === 'dismissible'}>
      <al-button slot="trigger">Open</al-button>
      <p>Body</p>
    </al-popover>
  `);
  await el.updateComplete;
  await tick();
  return el;
};

describe('al-popover', () => {
  it('opens and closes on repeated trigger clicks', async () => {
    // Ported from popover.stories.ts WithMenu, which clicked the trigger three
    // times. Two is enough to prove the toggle; the third only re-proved the
    // first.
    const el = await withTrigger();
    const seen: Array<[string, boolean]> = [];
    el.addEventListener('onPopoverOpen', (e) => seen.push(['open', (e as CustomEvent).detail.active]));
    el.addEventListener('onPopoverClose', (e) => seen.push(['close', (e as CustomEvent).detail.active]));

    await userEvent.click(triggerWrapper(el));
    await el.updateComplete;
    expect(el.isActive).toBe(true);
    expect(el.shadowRoot!.querySelector('.al-c-popover')!.className).toContain('al-is-active');

    // The second click goes through `.click()`, not the real pointer: once the
    // popover is open its panel is absolutely positioned OVER the trigger in a
    // bare fixture, and Playwright correctly refuses to click an obscured
    // element ("al-heading ... intercepts pointer events"). That is fixture
    // geometry, not a component defect — the story gives the trigger room. The
    // handler under test is the same one either way.
    triggerWrapper(el).click();
    await el.updateComplete;
    expect(el.isActive).toBe(false);
    expect(seen).toEqual([
      ['open', true],
      ['close', false],
    ]);
  });

  it('opens on Enter from the slotted trigger', async () => {
    // popover.ts:223-232 — the handler matches on `[slot="trigger"]`, so the
    // event has to originate at the SLOTTED element, not the shadow wrapper
    // around it. A test that dispatched at the wrapper would pass nothing.
    const el = await withTrigger();
    const trigger = el.querySelector('al-button') as HTMLElement;

    trigger.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', bubbles: true, composed: true }));
    await el.updateComplete;
    expect(el.isActive).toBe(true);
  });

  it('closes on Escape from anywhere inside it', async () => {
    // Ported from popover.stories.ts Default / WithMenu / WithContent — all
    // three sent Escape from a different node (the container, the first menu
    // item, the close button). One assertion covers the contract: the keydown
    // listener is on the popover's root element, so any composed Escape from
    // within reaches it.
    for (const from of ['container', 'close-button'] as const) {
      const el = await withTrigger('dismissible');
      el.open();
      await el.updateComplete;
      await tick();
      expect(el.isActive).toBe(true);

      const source = from === 'container' ? container(el) : closeButton(el);
      expect(source, from).not.toBeNull();
      source.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true, composed: true }));
      await el.updateComplete;
      expect(el.isActive, `Escape from the ${from}`).toBe(false);
    }
  });

  it('does not react to Escape when it is already closed', async () => {
    // popover.ts:236 gates on `isActive === true`. Without the gate an Escape
    // aimed at something else on the page would fire a spurious onPopoverClose.
    const el = await withTrigger();
    let closes = 0;
    el.addEventListener('onPopoverClose', () => closes++);

    el.shadowRoot!
      .querySelector('.al-c-popover')!
      .dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true, composed: true }));
    await el.updateComplete;
    expect(closes).toBe(0);
  });

  it('closes when a mousedown lands outside it', async () => {
    const el = await withTrigger();
    el.open();
    await el.updateComplete;
    await tick();

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }));
    await el.updateComplete;
    expect(el.isActive).toBe(false);
  });

  it('stays open when the mousedown is inside its own tree', async () => {
    // popover.ts:209 uses `composedPath().includes(host)` rather than
    // `contains()`, because a click on the slotted trigger or on anything in
    // the shadow root would otherwise read as "outside" and close the panel
    // the user just interacted with.
    const el = await withTrigger();
    el.open();
    await el.updateComplete;
    await tick();

    container(el).dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }));
    await el.updateComplete;
    expect(el.isActive).toBe(true);
    el.close();
  });

  it('closes through the close button and says so with its own event', async () => {
    // Ported from popover.stories.ts WithContent. onPopoverCloseButton is
    // distinct from onPopoverClose — a consumer distinguishing "user dismissed
    // deliberately" from "closed for any reason" needs both to fire.
    const el = await withTrigger('dismissible');
    el.open();
    await el.updateComplete;
    await tick();

    let closes = 0;
    let closeButtons = 0;
    el.addEventListener('onPopoverClose', () => closes++);
    el.addEventListener('onPopoverCloseButton', () => closeButtons++);

    await userEvent.click(closeButton(el).shadowRoot!.querySelector('button') as HTMLElement);
    await el.updateComplete;
    expect(el.isActive).toBe(false);
    expect([closes, closeButtons]).toEqual([1, 1]);
  });

  it('renders no close button unless isDismissible is set', async () => {
    const el = await withTrigger();
    expect(closeButton(el)).toBeNull();
  });

  it('stops listening for outside clicks once it is removed from the document', async () => {
    // popover.ts:155/164 add and remove a listener on `globalThis`, not on the
    // element — a missed removal leaks one listener per mount and keeps a
    // detached popover reacting to page clicks forever.
    const el = await withTrigger();
    el.open();
    await el.updateComplete;
    el.remove();

    let closes = 0;
    el.addEventListener('onPopoverClose', () => closes++);
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }));
    await tick();
    expect(closes).toBe(0);
  });
});
