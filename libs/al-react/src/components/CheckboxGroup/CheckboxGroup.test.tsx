import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, flush, render, tick } from '../../__harness__/render';
import { ALCheckboxGroup } from './CheckboxGroup';
import { ALCheckbox } from '../Checkbox/Checkbox';

afterEach(cleanup);

const innerInput = (el: Element) => el.shadowRoot!.querySelector('input[type="checkbox"]') as HTMLInputElement;

describe('<ALCheckboxGroup> (React wrapper)', () => {
  it('calls onCheckboxGroupChange when a child checkbox is actually toggled', async () => {
    // THE OTHER REGRESSION: the wrapper mapped `onChange: 'change'` while
    // <al-checkbox-group> dispatched NOTHING AT ALL. The fix had to invent the
    // event first (checkbox-group.ts:117-141 re-emits the bubbling per-checkbox
    // 'onCheckboxChange' as a group-level 'onCheckboxGroupChange'). This is the
    // test that fails if either half regresses.
    const onCheckboxGroupChange = vi.fn();
    const { element } = await render(
      <ALCheckboxGroup label="Toppings" onCheckboxGroupChange={onCheckboxGroupChange}>
        <ALCheckbox value="cheese">Cheese</ALCheckbox>
        <ALCheckbox value="olives">Olives</ALCheckbox>
      </ALCheckboxGroup>
    );
    await element.updateComplete;
    await tick();

    const boxes = [...element.querySelectorAll('*')].filter((n) => n.tagName.startsWith('AL-CHECKBOX-'));
    expect(boxes.length, 'both checkboxes must render as upgraded elements').toBe(2);

    await flush(async () => {
      innerInput(boxes[0]).click();
      await tick();
    });

    expect(onCheckboxGroupChange).toHaveBeenCalledTimes(1);
    const detail = onCheckboxGroupChange.mock.calls[0][0].detail;
    expect(detail.value).toBe('cheese');
    expect(detail.checked).toBe(true);
    expect(detail.checkedValues).toEqual(['cheese']);
  });

  it('reports the full checked set as more boxes are ticked', async () => {
    const onCheckboxGroupChange = vi.fn();
    const { element } = await render(
      <ALCheckboxGroup label="Toppings" onCheckboxGroupChange={onCheckboxGroupChange}>
        <ALCheckbox value="cheese">Cheese</ALCheckbox>
        <ALCheckbox value="olives">Olives</ALCheckbox>
      </ALCheckboxGroup>
    );
    await element.updateComplete;
    await tick();
    const boxes = [...element.querySelectorAll('*')].filter((n) => n.tagName.startsWith('AL-CHECKBOX-'));

    await flush(async () => {
      innerInput(boxes[0]).click();
      innerInput(boxes[1]).click();
      await tick();
    });

    expect(onCheckboxGroupChange).toHaveBeenCalledTimes(2);
    expect(onCheckboxGroupChange.mock.calls[1][0].detail.checkedValues).toEqual(['cheese', 'olives']);
  });

  it('also delivers the per-checkbox event to the child wrapper', async () => {
    const onCheckboxChange = vi.fn();
    const { element } = await render(
      <ALCheckboxGroup label="Toppings">
        <ALCheckbox value="cheese" onCheckboxChange={onCheckboxChange}>Cheese</ALCheckbox>
      </ALCheckboxGroup>
    );
    await element.updateComplete;
    await tick();
    const box = [...element.querySelectorAll('*')].find((n) => n.tagName.startsWith('AL-CHECKBOX-'))!;

    await flush(async () => {
      innerInput(box).click();
      await tick();
    });

    expect(onCheckboxChange).toHaveBeenCalledTimes(1);
    expect(onCheckboxChange.mock.calls[0][0].detail.checked).toBe(true);
  });
});
