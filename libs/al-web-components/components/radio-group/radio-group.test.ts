import { fixture, html } from '@open-wc/testing-helpers';
import { userEvent } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import './radio-group';
import '../radio/radio';
import type { ALRadioGroup } from './radio-group';
import type { ALRadio } from '../radio/radio';

const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
const inputOf = (item: ALRadio) => item.shadowRoot!.querySelector('input.al-c-radio__input') as HTMLInputElement;
const items = (el: ALRadioGroup) => [...el.querySelectorAll('al-radio')] as ALRadio[];

const group = () =>
  fixture<ALRadioGroup>(html`
    <al-radio-group label="Size">
      <al-radio name="size" value="xs">XS</al-radio>
      <al-radio name="size" value="sm">SM</al-radio>
      <al-radio name="size" value="md">MD</al-radio>
      <al-radio name="size" value="lg">LG</al-radio>
    </al-radio-group>
  `);

describe('al-radio-group', () => {
  it('renders a fieldset/legend, not a div with a heading', async () => {
    // The legend is the group's accessible name. radio-group is one of the
    // three *-group components AGENTS.md keeps precisely because of this
    // semantic — if it degrades to a plain box the grouping is gone.
    const el = await group();
    await el.updateComplete;
    const fieldset = el.shadowRoot!.querySelector('fieldset');
    expect(fieldset).not.toBeNull();
    expect(fieldset!.querySelector('legend')!.textContent!.trim()).toBe('Size');
  });

  it('renders every slotted radio with its own input', async () => {
    // Ported from radio-group.stories.ts Default. The story's own comment
    // records that `/^radio-/` used to match the GROUP's test id too, so
    // radioItems[0] was the <al-radio-group> — which has no <input> — and the
    // four assertions checked the wrong four elements. Selecting on the tag
    // name makes that class of mistake impossible.
    const el = await group();
    await el.updateComplete;
    await tick();
    const all = items(el);
    expect(all).toHaveLength(4);
    for (const item of all) expect(inputOf(item)).not.toBeNull();
  });

  it('keeps exactly one radio checked as the selection moves', async () => {
    const el = await group();
    await el.updateComplete;
    await tick();
    const all = items(el);

    await userEvent.click(inputOf(all[2]));
    await el.updateComplete;
    expect(el.checkedItem).toBe(all[2]);
    expect(all.map((i) => !!i.isChecked)).toEqual([false, false, true, false]);

    await userEvent.click(inputOf(all[0]));
    await el.updateComplete;
    expect(el.checkedItem).toBe(all[0]);
    expect(all.map((i) => !!i.isChecked), 'the previous choice must be cleared').toEqual([true, false, false, false]);
  });

  it('moves the selection with the arrow keys and wraps at both ends', async () => {
    // This is the assertion the Storybook play function had COMMENTED OUT
    // (radio-group.stories.ts Default). Roving arrow selection is the entire
    // reason this wrapper exists rather than an <al-layout>, so it is the one
    // behavior that must not go untested.
    const el = await group();
    await el.updateComplete;
    await tick();
    const all = items(el);

    await userEvent.click(inputOf(all[0]));
    await el.updateComplete;

    await userEvent.keyboard('{ArrowDown}');
    await el.updateComplete;
    expect(el.checkedItem).toBe(all[1]);

    await userEvent.keyboard('{ArrowUp}');
    await el.updateComplete;
    expect(el.checkedItem).toBe(all[0]);

    // Wrap backwards off the front, to the last item.
    await userEvent.keyboard('{ArrowUp}');
    await el.updateComplete;
    expect(el.checkedItem, 'ArrowUp on the first radio must wrap to the last').toBe(all[3]);

    // Wrap forwards off the end, back to the first.
    await userEvent.keyboard('{ArrowDown}');
    await el.updateComplete;
    expect(el.checkedItem, 'ArrowDown on the last radio must wrap to the first').toBe(all[0]);
  });

  it('skips a disabled radio when arrowing past it', async () => {
    // radio-group.ts:197-205 — the `while (isDisabled)` loop. A group that
    // landed on a disabled radio would report a value the user cannot submit.
    const el = await fixture<ALRadioGroup>(html`
      <al-radio-group label="Size">
        <al-radio name="s" value="a">A</al-radio>
        <al-radio name="s" value="b" isDisabled>B</al-radio>
        <al-radio name="s" value="c">C</al-radio>
      </al-radio-group>
    `);
    await el.updateComplete;
    await tick();
    const all = items(el);

    await userEvent.click(inputOf(all[0]));
    await el.updateComplete;

    await userEvent.keyboard('{ArrowDown}');
    await el.updateComplete;
    expect(el.checkedItem, 'the disabled radio must be stepped over').toBe(all[2]);
    expect(all[1].isChecked).toBeFalsy();
  });

  it('reports the newly checked name and value through onRadioGroupChange', async () => {
    const el = await group();
    await el.updateComplete;
    await tick();
    const all = items(el);
    await userEvent.click(inputOf(all[0]));
    await el.updateComplete;

    const seen: unknown[] = [];
    el.addEventListener('onRadioGroupChange', (e) => seen.push((e as CustomEvent).detail));

    await userEvent.keyboard('{ArrowDown}');
    await el.updateComplete;
    expect(seen).toEqual([{ checked: true, name: 'size', value: 'sm' }]);
  });

  it('propagates isRequired and isDisabled down to every slotted radio', async () => {
    // radio-group.ts:146-157 pushes the group's state onto the items in
    // firstUpdated — the items themselves render the native attributes, so a
    // group-level `isRequired` that never reached them would validate as
    // optional.
    const el = await fixture<ALRadioGroup>(html`
      <al-radio-group label="Size" isRequired isDisabled>
        <al-radio name="s" value="a">A</al-radio>
        <al-radio name="s" value="b">B</al-radio>
      </al-radio-group>
    `);
    await el.updateComplete;
    await tick();
    for (const item of items(el)) {
      await item.updateComplete;
      expect(item.isRequired).toBe(true);
      expect(item.isDisabled).toBe(true);
      expect(inputOf(item).required).toBe(true);
      expect(inputOf(item).disabled).toBe(true);
    }
  });

  it('keeps the legend in the accessibility tree when it is only visually hidden', async () => {
    // hideLegend has to be a CSS treatment. Removing the <legend> would strip
    // the group's accessible name rather than hide it.
    const el = await fixture<ALRadioGroup>(html`
      <al-radio-group label="Size" hideLegend><al-radio name="s" value="a">A</al-radio></al-radio-group>
    `);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('fieldset')!.className).toContain('al-has-hidden-legend');
    expect(el.shadowRoot!.querySelector('legend')!.textContent!.trim()).toBe('Size');
  });

  it('moves DOM focus onto the newly checked radio', async () => {
    // radio-group.ts:212. The arrow keys only keep working because focus
    // travels with the selection; asserting it directly names the contract the
    // roving tests above depend on implicitly.
    const el = await group();
    await el.updateComplete;
    await tick();
    const all = items(el);

    await userEvent.click(inputOf(all[0]));
    await el.updateComplete;

    await userEvent.keyboard('{ArrowDown}');
    await el.updateComplete;
    expect(all[1].shadowRoot!.activeElement).toBe(inputOf(all[1]));
  });

  it('contributes nothing to the owning form', async () => {
    // FINDING, documented not endorsed. Neither al-radio-group nor al-radio
    // declares `formAssociated`, and each <input> sits in its own shadow root,
    // so the chosen option never reaches FormData. Only al-input participates
    // (input.ts:262 -> controllers/form-associated.ts).
    const form = await fixture<HTMLFormElement>(html`
      <form>
        <al-radio-group label="Size">
          <al-radio name="size" value="xs">XS</al-radio>
          <al-radio name="size" value="sm">SM</al-radio>
        </al-radio-group>
      </form>
    `);
    const el = form.querySelector('al-radio-group') as ALRadioGroup;
    await el.updateComplete;
    await tick();

    await userEvent.click(inputOf(items(el)[1]));
    await el.updateComplete;

    expect(items(el)[1].isChecked).toBe(true);
    expect(new FormData(form).get('size'), 'current behavior — not form-associated').toBeNull();
  });
  it('does not hang when every item in the group is disabled', async () => {
    // radio-group.ts:199 walked `while (this.radioItems[newIndex].isDisabled)`
    // looking for an enabled item, and the wrap immediately below it kept the
    // index cycling rather than running off the end — so an all-disabled group
    // span-locked the browser tab on the first arrow key. It was found by the
    // Vitest port and deliberately left UNTESTED at the time, because the test
    // would have frozen the suite instead of failing it.
    //
    // Bounded to one full pass 2026-08-24, so this is now safe to assert. The
    // timeout is the real assertion: if the guard regresses, this test hangs
    // and vitest kills it rather than the whole run going quiet.
    const el = await fixture<ALRadioGroup>(html`
      <al-radio-group label="Size" name="size">
        <al-radio isDisabled value="s">S</al-radio>
        <al-radio isDisabled value="m">M</al-radio>
      </al-radio-group>
    `);
    await el.updateComplete;

    const before = items(el).map((item) => item.isChecked);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }));
    await tick();
    await el.updateComplete;

    // Nothing legal to land on, so selection must not move — and in particular
    // must not settle on a disabled item, which would then have `.focus()`
    // called on a `:not(:disabled)` selector that matches nothing.
    expect(items(el).map((item) => item.isChecked)).toEqual(before);
  }, 5000);
});
