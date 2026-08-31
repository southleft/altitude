import { fixture, html } from '@open-wc/testing-helpers';
import { userEvent } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import './chip';
import type { ALChip } from './chip';

const button = (el: ALChip) => el.shadowRoot!.querySelector('button.al-c-chip') as HTMLButtonElement;
const closeIcon = (el: ALChip) => el.shadowRoot!.querySelector('.al-c-chip__close') as HTMLElement;

describe('al-chip', () => {
  it('dismisses when the close icon is clicked', async () => {
    // Ported from chip.stories.ts WithIconDismissible.
    const el = await fixture<ALChip>(html`<al-chip isDismissible>Filter</al-chip>`);
    await el.updateComplete;
    expect(closeIcon(el), 'isDismissible must render a close affordance').not.toBeNull();

    await userEvent.click(closeIcon(el));
    await el.updateComplete;
    expect(el.isDismissed).toBe(true);
  });

  it('mirrors the dismissed state onto the HOST class list, not only the shadow root', async () => {
    // chip.ts:83 — `this.classList.add('al-is-dismissed')` on the host is what a
    // parent layout selects on to reflow the remaining chips. It is the only
    // state this component publishes outside its own shadow root, so a
    // shadow-root-only assertion would miss it disappearing.
    const el = await fixture<ALChip>(html`<al-chip isDismissible>Filter</al-chip>`);
    await el.updateComplete;
    expect(el.classList.contains('al-is-dismissed')).toBe(false);

    el.close();
    await el.updateComplete;
    expect(el.classList.contains('al-is-dismissed')).toBe(true);
    expect(button(el).className).toContain('al-is-dismissed');
  });

  it('dismisses on Escape while focused', async () => {
    const el = await fixture<ALChip>(html`<al-chip isDismissible>Filter</al-chip>`);
    await el.updateComplete;
    button(el).focus();

    await userEvent.keyboard('{Escape}');
    await el.updateComplete;
    expect(el.isDismissed).toBe(true);
  });

  it('ignores Escape when the chip is not dismissible', async () => {
    // chip.ts:92-95 gates the Escape handler on `isDismissible`. Without the
    // gate a decorative chip would silently vanish under a stray Escape — and
    // the story only ever exercised the dismissible case.
    const el = await fixture<ALChip>(html`<al-chip>Static</al-chip>`);
    await el.updateComplete;
    button(el).focus();

    await userEvent.keyboard('{Escape}');
    await el.updateComplete;
    expect(el.isDismissed).toBeFalsy();
    expect(el.classList.contains('al-is-dismissed')).toBe(false);
  });

  it('renders no close affordance unless isDismissible is set', async () => {
    const el = await fixture<ALChip>(html`<al-chip>Static</al-chip>`);
    await el.updateComplete;
    expect(closeIcon(el)).toBeNull();
  });

  it('emits onChipClose exactly once per dismissal path', async () => {
    const el = await fixture<ALChip>(html`<al-chip isDismissible>Filter</al-chip>`);
    await el.updateComplete;
    let fired = 0;
    el.addEventListener('onChipClose', () => fired++);

    await userEvent.click(closeIcon(el));
    await el.updateComplete;
    expect(fired).toBe(1);
  });
});
