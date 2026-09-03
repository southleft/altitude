import { fixture, html } from '@open-wc/testing-helpers';
import { userEvent } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import './alert';
import type { ALAlert } from './alert';

const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

/**
 * Wait for a condition instead of sampling once after a fixed delay.
 *
 * `auto-closes after autoCloseDelay seconds` was FLAKY: it slept 200ms for a
 * 100ms timer and asserted immediately after. That is a 2x margin in a plain
 * run and not enough under coverage instrumentation, which slows the whole
 * page — measured on 2026-09-03 as fail / pass / fail across three identical
 * runs of `vitest --coverage`. `test:unit:coverage` is a required check, so it
 * could red a PR at random and teach everyone to re-run reds rather than read
 * them.
 *
 * Polling keeps exactly what the test is for — the alert DOES close on its own
 * — while removing the dependency on wall-clock speed. The timeout is generous
 * because a slow machine is not a defect; a never-closing alert is, and that
 * still fails, with the state it was stuck in.
 */
async function waitUntil(
  predicate: () => boolean,
  description: string,
  { timeout = 3000, interval = 20 } = {},
): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (predicate()) return;
    await tick(interval);
  }
  throw new Error(`timed out after ${timeout}ms waiting for: ${description}`);
}
const box = (el: ALAlert) => el.shadowRoot!.querySelector('.al-c-alert') as HTMLElement;

describe('al-alert', () => {
  it('opens and closes through the al-is-active class, not just the property', async () => {
    // Ported from alert.stories.ts WithOpenButton. The class is what the CSS
    // reads; a component that flipped `isActive` but never re-rendered would
    // pass a property-only assertion and still be invisible.
    const el = await fixture<ALAlert>(html`<al-alert isDismissible>Saved</al-alert>`);
    await el.updateComplete;
    expect(box(el).className).not.toContain('al-is-active');

    el.open();
    await el.updateComplete;
    expect(el.isActive).toBe(true);
    expect(box(el).className).toContain('al-is-active');

    el.close();
    await el.updateComplete;
    expect(el.isActive).toBe(false);
    expect(box(el).className).not.toContain('al-is-active');
  });

  it('closes when the rendered close button is clicked', async () => {
    // The close control is an <al-button>, so the @click lives on the HOST.
    // Reaching for a bare `button` in al-alert's own shadow root finds nothing.
    const el = await fixture<ALAlert>(html`<al-alert isDismissible isActive>Saved</al-alert>`);
    await el.updateComplete;
    const closeBtn = el.shadowRoot!.querySelector('.al-c-alert__close') as HTMLElement;
    expect(closeBtn, 'isDismissible must render a close control').not.toBeNull();

    await userEvent.click(closeBtn);
    await el.updateComplete;
    expect(el.isActive).toBe(false);
    expect(box(el).className).not.toContain('al-is-active');
  });

  it('renders no close control unless isDismissible is set', async () => {
    const el = await fixture<ALAlert>(html`<al-alert isActive>Saved</al-alert>`);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.al-c-alert__close')).toBeNull();
  });

  it('emits open and close with the resulting active state', async () => {
    // Note the UNPREFIXED event names — every other component in the library
    // uses `onXChange`; alert.ts:19-20 documents the exception. Renaming these
    // is a breaking change, so the names are pinned here.
    const el = await fixture<ALAlert>(html`<al-alert>Saved</al-alert>`);
    const seen: Array<[string, boolean]> = [];
    el.addEventListener('open', (e) => seen.push(['open', (e as CustomEvent).detail.active]));
    el.addEventListener('close', (e) => seen.push(['close', (e as CustomEvent).detail.active]));

    el.open();
    el.close();
    await el.updateComplete;
    expect(seen).toEqual([
      ['open', true],
      ['close', false],
    ]);
  });

  it('auto-closes after autoCloseDelay seconds', async () => {
    // Ported from alert.stories.ts WithAutoClose. The delay is expressed in
    // SECONDS (alert.ts:130 multiplies by 1000), which is why this passes 0.1
    // rather than 100.
    /*
     * MOVE THE POINTER OFF FIRST. This is not ceremony — it is the whole reason
     * this test was flaky.
     *
     * `al-alert` pauses its auto-close timer while the pointer is over it
     * (deliberate: an alert should not vanish out from under someone reading
     * it). The virtual pointer is shared across tests in a file and stays where
     * the last `userEvent.click` left it. When a fixture happens to render this
     * alert under that resting position, `handleMouseOver` fires and the timer
     * pauses for the whole run.
     *
     * Measured: in isolation this test passes in 133ms with AND without
     * coverage; run after its neighbours it timed out at 3s. Coverage was never
     * the variable — it only changed the layout timing enough to alter how
     * often the pointer landed on the box.
     *
     * Worth knowing beyond the test: an alert that appears underneath a
     * stationary cursor will not auto-close until the pointer moves.
     */
    await userEvent.hover(document.body);

    const el = await fixture<ALAlert>(html`<al-alert isActive autoClose .autoCloseDelay=${0.1}>Saved</al-alert>`);
    await el.updateComplete;
    expect(el.isActive).toBe(true);

    await waitUntil(() => !el.isActive, 'the alert to auto-close');
    await el.updateComplete;
    expect(el.isActive).toBe(false);
    expect(box(el).className).not.toContain('al-is-active');
  });

  it('stays open indefinitely when autoClose is not set', async () => {
    const el = await fixture<ALAlert>(html`<al-alert isActive .autoCloseDelay=${0.05}>Saved</al-alert>`);
    await tick(200);
    expect(el.isActive).toBe(true);
  });

  it('pauses the auto-close timer while the pointer is over it, and resumes on leave', async () => {
    // `handleMouseOver` / `handleMouseLeave` existed since the component was
    // written and `render()` never bound them, so an auto-closing alert
    // vanished out from under whoever was reading it. Fixed 2026-08-24 by
    // binding the pair the same way toast.ts:217-218 does.
    //
    // The Storybook play function this replaces hovered, unhovered, and then
    // asserted only that the alert eventually closed — true whether the pause
    // worked or not, which is why it never caught this. Both halves are
    // asserted here instead: still open well past the delay while hovered,
    // and actually closing once the pointer leaves.
    const el = await fixture<ALAlert>(html`<al-alert isActive autoClose .autoCloseDelay=${0.1}>Saved</al-alert>`);
    await el.updateComplete;

    box(el).dispatchEvent(new MouseEvent('mouseover', { bubbles: true, composed: true }));
    await tick(200);
    expect(el.isActive, 'hover must hold the alert open past its delay').toBe(true);

    box(el).dispatchEvent(new MouseEvent('mouseleave', { bubbles: true, composed: true }));
    await tick(200);
    expect(el.isActive, 'leaving must let the timer finish the close').toBe(false);
  });

  it('announces itself as an alert to assistive technology', async () => {
    const el = await fixture<ALAlert>(html`<al-alert>Saved</al-alert>`);
    await el.updateComplete;
    expect(box(el).getAttribute('role')).toBe('alert');
  });

  it('maps each variant to its own modifier class and nothing else', async () => {
    for (const variant of ['success', 'warning', 'danger'] as const) {
      const el = await fixture<ALAlert>(html`<al-alert variant=${variant}>x</al-alert>`);
      await el.updateComplete;
      const className = box(el).className;
      expect(className, variant).toContain(`al-c-alert--${variant}`);
      for (const other of ['success', 'warning', 'danger'].filter((v) => v !== variant)) {
        expect(className, `${variant} must not carry --${other}`).not.toContain(`al-c-alert--${other}`);
      }
    }
  });
});
