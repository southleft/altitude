import { fixture, html } from '@open-wc/testing-helpers';
import { userEvent } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import './checkbox-group';
import '../checkbox/checkbox';
import type { ALCheckboxGroup } from './checkbox-group';
import type { ALCheckbox } from '../checkbox/checkbox';

const boxes = (el: ALCheckboxGroup) => [...el.querySelectorAll('al-checkbox')] as ALCheckbox[];
const input = (box: ALCheckbox) => box.shadowRoot!.querySelector('input.al-c-checkbox__input') as HTMLInputElement;

const group = () =>
  fixture<ALCheckboxGroup>(html`
    <al-checkbox-group label="Toppings">
      <al-checkbox value="cheese">Cheese</al-checkbox>
      <al-checkbox value="basil">Basil</al-checkbox>
      <al-checkbox value="olives">Olives</al-checkbox>
    </al-checkbox-group>
  `);

describe('al-checkbox-group', () => {
  it('renders a real fieldset with a legend — the reason the wrapper exists at all', async () => {
    // Per AGENTS.md "Arrangement vs. semantics", a group survives only for its
    // semantics. If this ever degraded to a <div>, the group would have no
    // reason to exist over <al-layout>.
    const el = await group();
    await el.updateComplete;

    const fieldset = el.shadowRoot!.querySelector('fieldset');
    expect(fieldset).not.toBeNull();
    const legend = fieldset!.querySelector('legend');
    expect(legend, 'the legend is the group\'s accessible name').not.toBeNull();
    expect(legend!.textContent!.trim()).toBe('Toppings');
  });

  it('keeps the legend in the accessibility tree when it is only visually hidden', async () => {
    // hideLegend must be a CSS treatment, not a removal — removing it would
    // strip the group's accessible name instead of hiding it.
    const el = await fixture<ALCheckboxGroup>(html`
      <al-checkbox-group label="Toppings" hideLegend><al-checkbox value="a">A</al-checkbox></al-checkbox-group>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('fieldset')!.className).toContain('al-has-hidden-legend');
    expect(el.shadowRoot!.querySelector('legend')!.textContent!.trim()).toBe('Toppings');
  });

  it('renders no legend at all when no label is supplied', async () => {
    const el = await fixture<ALCheckboxGroup>(html`
      <al-checkbox-group><al-checkbox value="a">A</al-checkbox></al-checkbox-group>
    `);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('legend')).toBeNull();
  });

  it('re-emits a child change as onCheckboxGroupChange carrying every checked value', async () => {
    // checkbox-group.ts:117-142 — before this listener existed the group
    // dispatched nothing and the React wrapper had no event to bind. The
    // aggregate `checkedValues` is the group's actual product; the per-item
    // `checked`/`value` describe the one that just moved.
    const el = await group();
    await el.updateComplete;
    const seen: any[] = [];
    el.addEventListener('onCheckboxGroupChange', (e) => seen.push((e as CustomEvent).detail));

    const [cheese, basil] = boxes(el);
    await userEvent.click(input(cheese));
    await el.updateComplete;
    expect(seen.at(-1)).toMatchObject({ checked: true, value: 'cheese', checkedValues: ['cheese'] });

    await userEvent.click(input(basil));
    await el.updateComplete;
    expect(seen.at(-1)).toMatchObject({ checked: true, value: 'basil', checkedValues: ['cheese', 'basil'] });
  });

  it('shrinks checkedValues when an item is unchecked', async () => {
    // The aggregate has to be recomputed, not appended to — a group event that
    // only ever grows is the classic bug here.
    const el = await group();
    await el.updateComplete;
    const seen: any[] = [];
    el.addEventListener('onCheckboxGroupChange', (e) => seen.push((e as CustomEvent).detail));

    const [cheese, basil] = boxes(el);
    await userEvent.click(input(cheese));
    await userEvent.click(input(basil));
    await el.updateComplete;
    expect(seen.at(-1).checkedValues).toEqual(['cheese', 'basil']);

    await userEvent.click(input(cheese));
    await el.updateComplete;
    expect(seen.at(-1)).toMatchObject({ checked: false, value: 'cheese', checkedValues: ['basil'] });
  });

  it('keeps the originating event on the re-emitted detail', async () => {
    // checkbox-group.ts:134 passes `e` through, so ALElement.dispatch attaches
    // `originalEvent`. Consumers use it to reach the checkbox that changed.
    const el = await group();
    await el.updateComplete;
    let detail: any;
    el.addEventListener('onCheckboxGroupChange', (e) => (detail = (e as CustomEvent).detail));

    await userEvent.click(input(boxes(el)[2]));
    await el.updateComplete;

    expect(detail.originalEvent).toBeInstanceOf(CustomEvent);
    expect(detail.originalEvent.type).toBe('onCheckboxChange');
  });

  it('pushes isRequired and isDisabled down onto every slotted checkbox', async () => {
    // checkbox-group.ts:162-173 — the group props are the only way a consumer
    // can disable the whole set, and they are applied once in firstUpdated.
    const el = await fixture<ALCheckboxGroup>(html`
      <al-checkbox-group label="Toppings" isRequired isDisabled>
        <al-checkbox value="a">A</al-checkbox>
        <al-checkbox value="b">B</al-checkbox>
      </al-checkbox-group>
    `);
    await el.updateComplete;
    await Promise.all(boxes(el).map((b) => b.updateComplete));

    for (const box of boxes(el)) {
      expect(box.isRequired).toBe(true);
      expect(box.isDisabled).toBe(true);
      expect(input(box).disabled).toBe(true);
      expect(input(box).required).toBe(true);
    }
  });

  it('leaves untouched checkboxes alone when the group sets neither flag', async () => {
    const el = await group();
    await el.updateComplete;
    for (const box of boxes(el)) {
      expect(box.isDisabled).toBeFalsy();
      expect(box.isRequired).toBeFalsy();
    }
  });

  it('contributes nothing to the owning form', async () => {
    // FINDING, documented not endorsed — same gap as al-checkbox: no
    // `formAssociated`, so a checked group is invisible to FormData.
    const form = await fixture<HTMLFormElement>(html`
      <form>
        <al-checkbox-group label="Toppings">
          <al-checkbox name="topping" value="cheese">Cheese</al-checkbox>
        </al-checkbox-group>
      </form>
    `);
    const el = form.querySelector('al-checkbox-group') as ALCheckboxGroup;
    await el.updateComplete;

    await userEvent.click(input(boxes(el)[0]));
    await el.updateComplete;

    expect(boxes(el)[0].isChecked).toBe(true);
    expect(new FormData(form).getAll('topping'), 'current behavior — the group is not form-associated').toEqual([]);
  });
});
