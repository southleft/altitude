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

  it('DEFECT: hovering an auto-closing alert does NOT pause the timer', async () => {
    // alert.ts:113 and alert.ts:123 define `handleMouseOver` / `handleMouseLeave`
    // to pause and resume auto-close — but alert.ts:render() never binds them.
    // Compare toast.ts:217-218, which does bind exactly this pair. The
    // Storybook play function (alert.stories.ts WithAutoClose) hovered and
    // unhovered and then only asserted the alert eventually closed, which is
    // true whether or not the pause works, so it never caught this.
    //
    // This test asserts the CURRENT (wrong) behavior so the suite stays green
    // and the gap is recorded. When the handlers are wired up, this test will
    // fail — that is the signal to flip it to `toBe(true)`.
    const el = await fixture<ALAlert>(html`<al-alert isActive autoClose .autoCloseDelay=${0.1}>Saved</al-alert>`);
    await el.updateComplete;

    box(el).dispatchEvent(new MouseEvent('mouseover', { bubbles: true, composed: true }));
    await tick(200);

    expect(el.isActive, 'if this is true the mouseover binding was added — update this test').toBe(false);
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
