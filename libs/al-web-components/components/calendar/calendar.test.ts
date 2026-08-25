import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import './calendar';
import type { ALCalendar } from './calendar';

const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const days = (el: ALCalendar) => [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button[data-date]')];
const dayFor = (el: ALCalendar, iso: string) =>
  el.shadowRoot!.querySelector<HTMLButtonElement>(`button[data-date="${iso}"]`);

/** Local-time Date. `new Date('2026-03-15')` is parsed as UTC and lands on the
 *  14th west of Greenwich, which would make every assertion below timezone
 *  dependent. */
const local = (y: number, m: number, d: number) => new Date(y, m - 1, d);

async function calendarOn(y: number, m: number, d: number) {
  // Pin the month so the keyboard assertions are about the key model, not
  // about whatever today happens to be.
  // `currentDate` is what connectedCallback turns into `navDate` (calendar.ts:216),
  // so it is the supported way to pin which month renders.
  const el = await fixture<ALCalendar>(
    html`<al-calendar .currentDate=${local(y, m, d)} .selectedDate=${local(y, m, d)}></al-calendar>`
  );
  await el.updateComplete;
  await tick();
  return el;
}

const press = (target: HTMLElement, code: string) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, composed: true, cancelable: true }));

describe('al-calendar', () => {
  it('renders a real table with column headers, not role="presentation"', async () => {
    // The grid used to be role="presentation" with ~30 sequential tab stops.
    const el = await calendarOn(2026, 3, 15);
    const table = el.shadowRoot!.querySelector('table')!;
    expect(table.getAttribute('role')).not.toBe('presentation');
    expect(table.getAttribute('aria-label')).toBeTruthy();

    const headers = [...table.querySelectorAll('th')];
    expect(headers).toHaveLength(7);
    for (const th of headers) expect(th.getAttribute('scope')).toBe('col');
  });

  it('exposes exactly one tab stop in the whole day grid', async () => {
    const el = await calendarOn(2026, 3, 15);
    const roving = days(el).filter((d) => d.tabIndex === 0);
    expect(days(el).length).toBeGreaterThan(27);
    expect(roving).toHaveLength(1);
    expect(roving[0].dataset.date).toBe('2026-03-15');
  });

  it('gives every day an unambiguous accessible name', async () => {
    const el = await calendarOn(2026, 3, 15);
    const names = days(el).map((d) => d.getAttribute('aria-label'));
    expect(names.every((n) => n && n.length > 2)).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });

  it('moves by day with Left/Right and by week with Up/Down', async () => {
    const el = await calendarOn(2026, 3, 15);
    const start = dayFor(el, '2026-03-15')!;
    start.focus();

    press(start, 'ArrowRight');
    await tick();
    expect((el.shadowRoot!.activeElement as HTMLElement).dataset.date).toBe('2026-03-16');

    press(el.shadowRoot!.activeElement as HTMLElement, 'ArrowDown');
    await tick();
    expect((el.shadowRoot!.activeElement as HTMLElement).dataset.date).toBe('2026-03-23');

    press(el.shadowRoot!.activeElement as HTMLElement, 'ArrowUp');
    await tick();
    expect((el.shadowRoot!.activeElement as HTMLElement).dataset.date).toBe('2026-03-16');

    press(el.shadowRoot!.activeElement as HTMLElement, 'ArrowLeft');
    await tick();
    expect((el.shadowRoot!.activeElement as HTMLElement).dataset.date).toBe('2026-03-15');
  });

  it('moves to the ends of the week with Home and End', async () => {
    const el = await calendarOn(2026, 3, 18); // a Wednesday
    const start = dayFor(el, '2026-03-18')!;
    start.focus();

    press(start, 'Home');
    await tick();
    expect((el.shadowRoot!.activeElement as HTMLElement).dataset.date).toBe('2026-03-15');

    press(el.shadowRoot!.activeElement as HTMLElement, 'End');
    await tick();
    expect((el.shadowRoot!.activeElement as HTMLElement).dataset.date).toBe('2026-03-21');
  });

  it('pages the displayed month when the arrow key crosses its edge', async () => {
    const el = await calendarOn(2026, 3, 1);
    const start = dayFor(el, '2026-03-01')!;
    start.focus();

    press(start, 'ArrowLeft');
    await tick(80);

    expect(dayFor(el, '2026-02-28'), 'February must now be rendered').not.toBeNull();
    expect((el.shadowRoot!.activeElement as HTMLElement).dataset.date).toBe('2026-02-28');
  });

  it('pages a whole month with PageUp / PageDown', async () => {
    const el = await calendarOn(2026, 3, 15);
    const start = dayFor(el, '2026-03-15')!;
    start.focus();

    press(start, 'PageDown');
    await tick(80);
    expect((el.shadowRoot!.activeElement as HTMLElement).dataset.date).toBe('2026-04-15');

    press(el.shadowRoot!.activeElement as HTMLElement, 'PageUp');
    await tick(80);
    expect((el.shadowRoot!.activeElement as HTMLElement).dataset.date).toBe('2026-03-15');
  });

  it('leaves keys it does not own alone', async () => {
    const el = await calendarOn(2026, 3, 15);
    const start = dayFor(el, '2026-03-15')!;
    start.focus();
    const evt = new KeyboardEvent('keydown', { code: 'KeyQ', bubbles: true, composed: true, cancelable: true });
    start.dispatchEvent(evt);
    expect(evt.defaultPrevented).toBe(false);
  });

  it('emits onCalendarChange with both the formatted and the raw date', async () => {
    const el = await calendarOn(2026, 3, 15);
    const seen: any[] = [];
    el.addEventListener('onCalendarChange', (e) => seen.push((e as CustomEvent).detail));

    dayFor(el, '2026-03-20')!.click();
    await el.updateComplete;

    expect(seen).toHaveLength(1);
    expect(seen[0].rawDate instanceof Date).toBe(true);
    expect(seen[0].rawDate.getDate()).toBe(20);
    expect(typeof seen[0].value).toBe('string');
  });

  it('marks the selected day with aria-pressed and moves the tab stop to it', async () => {
    const el = await calendarOn(2026, 3, 15);
    dayFor(el, '2026-03-20')!.click();
    await el.updateComplete;
    await tick();

    expect(dayFor(el, '2026-03-20')!.getAttribute('aria-pressed')).toBe('true');
    expect(dayFor(el, '2026-03-15')!.hasAttribute('aria-pressed')).toBe(false);
    expect(days(el).filter((d) => d.tabIndex === 0)).toHaveLength(1);
  });

  it('names the month/year picker so it is not announced as a bare dialog', async () => {
    // The popup is role="dialog" and its content is a grid of year headings and
    // month buttons — no heading it could be named from, so a screen reader
    // announced "dialog" and stopped. Found by lit-a11y/accessible-name and
    // fixed 2026-08-25 with a settable `monthSelectorLabel`, so the name can be
    // localised rather than hardcoded English.
    const el = await fixture<ALCalendar>(html`<al-calendar></al-calendar>`);
    await el.updateComplete;

    const popup = el.shadowRoot!.querySelector('.al-c-calendar__month-selector-popup')!;
    expect(popup.getAttribute('role')).toBe('dialog');
    expect(popup.getAttribute('aria-label')).toBe('Choose month and year');

    el.monthSelectorLabel = 'Mois et année';
    await el.updateComplete;
    expect(popup.getAttribute('aria-label'), 'must be settable, not baked in').toBe('Mois et année');
  });
});
