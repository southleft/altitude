import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import '../badge/badge';
import './table';
import type { ALTable } from './table';

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status' }
];

describe('al-table (data-driven mode)', () => {
  it('pads header cells with the same inline/block padding as body cells', async () => {
    // Header cells used to declare `padding: 0` (the sort button carries its
    // own padding), so a NON-sortable header label sat flush against the cell
    // edge while the body cells beneath it were inset.
    const el = await fixture<ALTable>(html`
      <al-table .columns=${columns} .data=${[{ id: '1', name: 'Ada', status: 'Active' }]}></al-table>
    `);
    await el.updateComplete;

    const th = el.shadowRoot!.querySelector('th')!;
    const td = el.shadowRoot!.querySelector('td')!;
    const thCs = getComputedStyle(th);
    const tdCs = getComputedStyle(td);

    expect(parseFloat(tdCs.paddingInlineStart)).toBeGreaterThan(0);
    expect(thCs.paddingInlineStart).toBe(tdCs.paddingInlineStart);
    expect(thCs.paddingInlineEnd).toBe(tdCs.paddingInlineEnd);
    expect(thCs.paddingBlockStart).toBe(tdCs.paddingBlockStart);
    expect(thCs.paddingBlockEnd).toBe(tdCs.paddingBlockEnd);
  });

  it('aligns a sortable header label with the body cells (padding lives on the button)', async () => {
    const el = await fixture<ALTable>(html`
      <al-table
        .columns=${[{ key: 'name', label: 'Name', isSortable: true }]}
        .data=${[{ id: '1', name: 'Ada' }]}
      ></al-table>
    `);
    await el.updateComplete;

    const th = el.shadowRoot!.querySelector('th')!;
    const button = th.querySelector('button')!;
    const td = el.shadowRoot!.querySelector('td')!;

    // The button fills the cell so the whole header is the click target; the
    // label's inset therefore comes from the button, not the cell.
    expect(getComputedStyle(th).paddingInlineStart).toBe('0px');
    expect(getComputedStyle(button).paddingInlineStart).toBe(getComputedStyle(td).paddingInlineStart);
    expect(button.getBoundingClientRect().left).toBe(th.getBoundingClientRect().left);
  });

  it('renders a DOM node supplied as a cell value', async () => {
    // Lets a consumer put a badge (or any element) in a cell without dropping
    // to the unstyled slotted mode.
    const badge = document.createElement('al-badge');
    badge.textContent = 'Active';

    const el = await fixture<ALTable>(html`
      <al-table .columns=${columns} .data=${[{ id: '1', name: 'Ada', status: badge }]}></al-table>
    `);
    await el.updateComplete;

    const cells = el.shadowRoot!.querySelectorAll('tbody td');
    expect(cells[0].textContent!.trim()).toBe('Ada');
    expect(cells[1].querySelector('al-badge')).toBe(badge);
    expect(cells[1].textContent).not.toContain('[object');
  });
});
