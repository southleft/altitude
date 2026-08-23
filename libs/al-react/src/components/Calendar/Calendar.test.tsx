import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, flush, render, tick } from '../../__harness__/render';
import { ALCalendar } from './Calendar';

afterEach(cleanup);

describe('<ALCalendar> (React wrapper)', () => {
  it('registers its element under a versioned tag', async () => {
    const { element } = await render(<ALCalendar />);
    expect(element).not.toBeNull();
    expect(customElements.get(element.tagName.toLowerCase()), `${element.tagName} must be defined`).toBeTruthy();
  });

  it('calls onCalendarChange when a day is actually picked', async () => {
    // THE REGRESSION THIS PINS: the wrapper mapped `onChange: 'change'`, an
    // event <al-calendar> never fires (it dispatches 'onCalendarChange' —
    // calendar.ts:524-525). Every React consumer's handler was dead, and no
    // test anywhere noticed because nothing drove the real component through
    // React. Dispatching the mapped event by hand would NOT have caught it;
    // only clicking a real day does.
    const onCalendarChange = vi.fn();
    const { element } = await render(<ALCalendar onCalendarChange={onCalendarChange} />);
    await element.updateComplete;
    await tick();

    const day = element.shadowRoot!.querySelector(
      'button[data-date]:not([disabled])'
    ) as HTMLButtonElement;
    expect(day, 'the calendar must render clickable days').not.toBeNull();

    await flush(async () => {
      day.click();
      await tick();
    });

    expect(onCalendarChange).toHaveBeenCalledTimes(1);
    const detail = onCalendarChange.mock.calls[0][0].detail;
    expect(detail.rawDate instanceof Date).toBe(true);
    expect(typeof detail.value).toBe('string');
  });

  it('rebinds the listener when the handler prop changes identity', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const mount = await render(<ALCalendar onCalendarChange={first} />);
    await mount.element.updateComplete;

    await mount.rerender(<ALCalendar onCalendarChange={second} />);

    await flush(async () => {
      mount.element.dispatchEvent(
        new CustomEvent('onCalendarChange', { detail: { value: 'x' }, bubbles: true, composed: true })
      );
    });

    expect(second).toHaveBeenCalledTimes(1);
    expect(first, 'the previous handler must be detached, not stacked').not.toHaveBeenCalled();
  });
});
