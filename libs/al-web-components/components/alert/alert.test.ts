import { fixture, html } from '@open-wc/testing-helpers';
import { userEvent } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import './alert';
import type { ALAlert } from './alert';

const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
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
    const el = await fixture<ALAlert>(html`<al-alert isActive autoClose .autoCloseDelay=${0.1}>Saved</al-alert>`);
    await el.updateComplete;
    expect(el.isActive).toBe(true);

    await tick(200);
    await el.updateComplete;
    expect(el.isActive).toBe(false);
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
