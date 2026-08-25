import { fixture, html } from '@open-wc/testing-helpers';
import { userEvent } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import './dialog';
import '../button/button';
import type { ALDialog } from './dialog';

const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
const container = (el: ALDialog) => el.shadowRoot!.querySelector('.al-c-dialog__container') as HTMLElement;

describe('al-dialog', () => {
  it('marks the dialog container inert and aria-modal=false while closed', async () => {
    // dialog.ts:381-386. A closed dialog that is not inert is still tabbable —
    // that was the shipped behavior before the a11y pass.
    const el = await fixture<ALDialog>(html`<al-dialog heading="Hi" transitionDelay="0"></al-dialog>`);
    expect(container(el).hasAttribute('inert')).toBe(true);
    expect(container(el).getAttribute('aria-modal')).toBe('false');

    el.open();
    await el.updateComplete;
    expect(container(el).hasAttribute('inert')).toBe(false);
    expect(container(el).getAttribute('aria-modal')).toBe('true');

    el.close();
    await el.updateComplete;
    expect(container(el).hasAttribute('inert')).toBe(true);
  });

  it('makes the rest of the page inert while open and restores it exactly on close', async () => {
    // ALElement.setOutsideInert (ALElement.ts:225-236) — a focus trap only
    // catches Tab; without `inert` a screen-reader user can still arrow into
    // the page behind the dialog.
    const outside = document.createElement('div');
    outside.id = 'al-test-outside';
    const alreadyInert = document.createElement('div');
    alreadyInert.setAttribute('inert', '');
    document.body.append(outside, alreadyInert);
    try {
      const el = await fixture<ALDialog>(html`<al-dialog heading="Hi" transitionDelay="0"></al-dialog>`);
      expect(outside.hasAttribute('inert')).toBe(false);

      el.open();
      await el.updateComplete;
      expect(outside.hasAttribute('inert'), 'sibling must go inert while the dialog is open').toBe(true);

      el.close();
      await el.updateComplete;
      expect(outside.hasAttribute('inert')).toBe(false);
      // Elements that were ALREADY inert are not ours to un-inert.
      expect(alreadyInert.hasAttribute('inert')).toBe(true);
    } finally {
      outside.remove();
      alreadyInert.remove();
    }
  });

  it('closes on Escape and reports it through onDialogClose', async () => {
    const el = await fixture<ALDialog>(html`<al-dialog heading="Hi" transitionDelay="0"></al-dialog>`);
    const closes: unknown[] = [];
    el.addEventListener('onDialogClose', (e) => closes.push((e as CustomEvent).detail.active));

    el.open();
    await el.updateComplete;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
    await el.updateComplete;

    expect(el.isActive).toBe(false);
    expect(closes).toEqual([false]);
  });

  it('closes on an outside mousedown, and does not when disableClickOutside is set', async () => {
    const open = await fixture<ALDialog>(html`<al-dialog heading="Hi" transitionDelay="0"></al-dialog>`);
    open.open();
    await open.updateComplete;
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }));
    await open.updateComplete;
    expect(open.isActive).toBe(false);

    const sticky = await fixture<ALDialog>(html`<al-dialog heading="Hi" transitionDelay="0" disableClickOutside></al-dialog>`);
    sticky.open();
    await sticky.updateComplete;
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }));
    await sticky.updateComplete;
    expect(sticky.isActive).toBe(true);
    sticky.close();
  });

  it('returns focus to whatever had it when the dialog was opened programmatically', async () => {
    // dialog.ts:279 captures `previouslyFocused`; dialog.ts:335-338 falls back
    // to it. Before the a11y pass a programmatic open()/close() with no slotted
    // trigger dropped focus to <body> (WCAG 2.4.3).
    const host = await fixture(html`
      <div><button id="al-test-opener">Open</button><al-dialog heading="Hi" transitionDelay="0"></al-dialog></div>
    `);
    const opener = host.querySelector('#al-test-opener') as HTMLButtonElement;
    const el = host.querySelector('al-dialog') as ALDialog;

    opener.focus();
    expect(document.activeElement).toBe(opener);

    el.open();
    await el.updateComplete;
    await tick(30); // let the focus trap take focus
    expect(document.activeElement).not.toBe(opener);

    el.close();
    await el.updateComplete;
    await tick(30);
    expect(document.activeElement).toBe(opener);
  });

  it('returns focus to the slotted trigger when closed by CLICKING the close button', async () => {
    // The regression this pins: `sendFocusToTrigger()` used to be gated on
    // `e?.detail === 0` ("was this a keyboard event?"), so every mouse close
    // path dropped focus. dialog.ts:325-330.
    const el = await fixture<ALDialog>(html`
      <al-dialog heading="Hi" transitionDelay="0"><al-button slot="trigger">Open</al-button></al-dialog>
    `);
    await tick();
    const triggerBtn = el.querySelector('al-button')!.shadowRoot!.querySelector('button') as HTMLButtonElement;

    // A REAL pointer click (detail === 1), not `.click()` — `HTMLElement.click()`
    // synthesizes detail 0, which is exactly the value the old heuristic treated
    // as "keyboard", so a `.click()`-driven test would pass against the bug.
    await userEvent.click(triggerBtn);
    await el.updateComplete;
    await tick(30);
    expect(el.isActive).toBe(true);

    const closeBtn = el.shadowRoot!.querySelector('.al-c-dialog__close-button')!.shadowRoot!.querySelector('button') as HTMLButtonElement;
    await userEvent.click(closeBtn);
    await el.updateComplete;
    await tick(30);

    expect(el.isActive).toBe(false);
    expect(document.activeElement).toBe(el.querySelector('al-button'));
    expect(el.querySelector('al-button')!.shadowRoot!.activeElement).toBe(triggerBtn);
  });

  it('fires onDialogCloseButton only for the close button, and onDialogClose for every path', async () => {
    const el = await fixture<ALDialog>(html`<al-dialog heading="Hi" transitionDelay="0"></al-dialog>`);
    let closes = 0;
    let closeButtons = 0;
    el.addEventListener('onDialogClose', () => closes++);
    el.addEventListener('onDialogCloseButton', () => closeButtons++);

    el.open();
    await el.updateComplete;
    el.close();
    await el.updateComplete;
    expect([closes, closeButtons]).toEqual([1, 0]);

    el.open();
    await el.updateComplete;
    (el.shadowRoot!.querySelector('.al-c-dialog__close-button')!.shadowRoot!.querySelector('button') as HTMLButtonElement).click();
    await el.updateComplete;
    expect([closes, closeButtons]).toEqual([2, 1]);
  });

  it('labels the dialog with an id that actually exists in its shadow root', async () => {
    const el = await fixture<ALDialog>(html`<al-dialog heading="Delete file?" transitionDelay="0"></al-dialog>`);
    await el.updateComplete;
    const labelledBy = container(el).getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    const target = el.shadowRoot!.querySelector(`[id="${labelledBy}"]`);
    expect(target, 'aria-labelledby must resolve to a real node').not.toBeNull();
    expect(target!.textContent).toContain('Delete file?');
  });
  it('opens and closes from the KEYBOARD, with no Enter handler of its own', async () => {
    // Ported from dialog.stories.ts Default, which sent `{Enter}` at the
    // trigger and at the close button. Worth keeping, and worth naming why it
    // works: dialog.ts:259-264 handles ONLY Escape. Enter opens the dialog
    // because the slotted trigger is a real <button>, the platform turns Enter
    // into a click, and that composed click reaches the
    // `.al-c-dialog__trigger` wrapper's @click (dialog.ts:378).
    //
    // The consequence, and the reason this is not redundant with the pointer
    // tests: swap the slotted trigger for a non-button element and the whole
    // keyboard path silently disappears, because nothing in this component
    // listens for Enter.
    const el = await fixture<ALDialog>(html`
      <al-dialog heading="Hi" transitionDelay="0"><al-button slot="trigger">Open</al-button></al-dialog>
    `);
    await tick(40);
    const triggerBtn = el.querySelector('al-button')!.shadowRoot!.querySelector('button') as HTMLButtonElement;

    triggerBtn.focus();
    await userEvent.keyboard('{Enter}');
    await el.updateComplete;
    await tick(30);
    expect(el.isActive).toBe(true);

    const closeBtn = el.shadowRoot!.querySelector('.al-c-dialog__close-button')!.shadowRoot!.querySelector('button') as HTMLButtonElement;
    closeBtn.focus();
    await userEvent.keyboard('{Enter}');
    await el.updateComplete;
    await tick(30);
    expect(el.isActive).toBe(false);
  });

  it('ignores Escape while it is already closed', async () => {
    // dialog.ts:261 gates on `isActive === true`. Without it, an Escape meant
    // for something else on the page fires a spurious onDialogClose.
    const el = await fixture<ALDialog>(html`<al-dialog heading="Hi" transitionDelay="0"></al-dialog>`);
    let closes = 0;
    el.addEventListener('onDialogClose', () => closes++);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
    await el.updateComplete;
    expect(closes).toBe(0);
  });
});
