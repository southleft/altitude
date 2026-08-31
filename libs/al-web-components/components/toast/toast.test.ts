import { fixture, html } from '@open-wc/testing-helpers';
import { userEvent } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import './toast';
import type { ALToast } from './toast';

const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
const box = (el: ALToast) => el.shadowRoot!.querySelector('.al-c-toast') as HTMLElement;
const closeButton = (el: ALToast) =>
  el.shadowRoot!.querySelector('.al-c-toast__close-button')!.shadowRoot!.querySelector('button') as HTMLButtonElement;

/**
 * Move the REAL pointer off the fixture area before a timing-sensitive test.
 *
 * The trap: `userEvent.click()` leaves Playwright's cursor parked at the screen
 * position it clicked. The next fixture mounts under that same position, the
 * browser fires a genuine `mouseover` at it, and toast.ts:217 correctly pauses
 * auto-close — so an auto-close test that merely FOLLOWS a click test hangs
 * open forever and fails for a reason that has nothing to do with the timer.
 * That is a real hover pause, not a bug; it just has to be excluded here.
 */
async function parkPointer() {
  const parking = document.createElement('div');
  parking.setAttribute('style', 'position:fixed;bottom:0;right:0;width:8px;height:8px;z-index:2147483647');
  document.body.append(parking);
  try {
    await userEvent.hover(parking);
  } finally {
    parking.remove();
  }
}

describe('al-toast', () => {
  it('dismisses on Escape while the close button has focus', async () => {
    // Ported from toast.stories.ts WithDismissible. Note the close control is
    // an <al-button>, so the focusable node is TWO shadow roots down — the
    // keydown listener that catches this is on al-toast's own container and
    // only sees the event because it is `composed`.
    const el = await fixture<ALToast>(html`<al-toast isActive isDismissible>Saved</al-toast>`);
    await el.updateComplete;
    await tick();
    expect(el.isDismissible).toBe(true);

    closeButton(el).focus();
    await userEvent.keyboard('{Escape}');
    await el.updateComplete;

    expect(el.isActive).toBe(false);
    expect(box(el).className).not.toContain('al-is-active');
  });

  it('ignores Escape when the toast is not dismissible', async () => {
    // toast.ts:167-171 gates on `isDismissible`. A status toast the consumer
    // deliberately made non-dismissible must survive a stray Escape.
    const el = await fixture<ALToast>(html`<al-toast isActive>Uploading…</al-toast>`);
    await el.updateComplete;
    box(el).dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true, composed: true }));
    await el.updateComplete;
    expect(el.isActive).toBe(true);
  });

  it('dismisses when the close button is clicked', async () => {
    const el = await fixture<ALToast>(html`<al-toast isActive isDismissible>Saved</al-toast>`);
    await el.updateComplete;
    await tick();

    await userEvent.click(closeButton(el));
    await el.updateComplete;
    expect(el.isActive).toBe(false);
  });

  it('renders no close button unless isDismissible is set', async () => {
    const el = await fixture<ALToast>(html`<al-toast isActive>Saved</al-toast>`);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.al-c-toast__close-button')).toBeNull();
  });

  it('auto-closes after autoCloseDelay seconds', async () => {
    // Ported from toast.stories.ts WithAutoClose. The delay is in SECONDS
    // (toast.ts:124 multiplies by 1000).
    await parkPointer();
    const el = await fixture<ALToast>(html`<al-toast isActive autoClose .autoCloseDelay=${0.1}>Saved</al-toast>`);
    await el.updateComplete;
    expect(el.isActive).toBe(true);

    await tick(200);
    await el.updateComplete;
    expect(el.isActive).toBe(false);
  });

  it('pauses auto-close while the pointer is over it and resumes on leave', async () => {
    // toast.ts:217-218 binds @mouseover/@mouseleave — this is the behavior the
    // WithAutoClose play function hovered for but never actually asserted (it
    // only waited for the toast to close, which happens either way). Without
    // the pause, a toast vanishes out from under a user who is reading it.
    //
    // al-alert declares the identical handler pair (alert.ts:113/123) and never
    // binds them; see alert.test.ts for that gap.
    await parkPointer();
    const el = await fixture<ALToast>(html`<al-toast isActive autoClose .autoCloseDelay=${0.15}>Saved</al-toast>`);
    await el.updateComplete;

    box(el).dispatchEvent(new MouseEvent('mouseover', { bubbles: true, composed: true }));
    await tick(300); // well past the delay
    expect(el.isActive, 'hover must hold the toast open').toBe(true);

    box(el).dispatchEvent(new MouseEvent('mouseleave', { bubbles: true, composed: true }));
    await tick(300);
    expect(el.isActive, 'leaving must restart the timer, not cancel it').toBe(false);
  });

  it('reports open and close through its events', async () => {
    const el = await fixture<ALToast>(html`<al-toast>Saved</al-toast>`);
    await el.updateComplete;
    const seen: Array<[string, boolean]> = [];
    el.addEventListener('onToastOpen', (e) => seen.push(['open', (e as CustomEvent).detail.active]));
    el.addEventListener('onToastClose', (e) => seen.push(['close', (e as CustomEvent).detail.active]));

    el.open();
    el.close();
    await el.updateComplete;
    expect(seen).toEqual([
      ['open', true],
      ['close', false],
    ]);
  });

  it('announces itself as an alert to assistive technology', async () => {
    const el = await fixture<ALToast>(html`<al-toast isActive>Saved</al-toast>`);
    await el.updateComplete;
    expect(box(el).getAttribute('role')).toBe('alert');
  });
});
