import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import './pagination';
import type { ALPagination } from './pagination';

describe('al-pagination', () => {
  it('ships a default pageSize that is one of its default pageSizeOptions', async () => {
    // pageSize defaulted to 10 while the page-size select offered
    // [20, 40, 60, 80, 100], so an unconfigured pagination showed a select
    // whose value matched none of its options. Generated pages had to set
    // pageSizeOptions by hand to paper over it.
    const el = await fixture<ALPagination>(html`<al-pagination totalRecords="200"></al-pagination>`);
    await el.updateComplete;

    expect(el.pageSizeOptions).toContain(el.pageSize);

    const optionLabels = Array.from(el.shadowRoot!.querySelectorAll('.al-c-pagination-dropdown [key]')).map((item) =>
      item.textContent!.trim()
    );
    expect(optionLabels).toContain(String(el.pageSize));
  });

  it('keeps the existing default page size of 10', async () => {
    // The fix adds 10 to the options rather than changing the page size, so
    // existing pages that relied on 10 rows per page are unaffected.
    const el = await fixture<ALPagination>(html`<al-pagination totalRecords="200"></al-pagination>`);
    await el.updateComplete;
    expect(el.pageSize).toBe(10);
    expect(el.label.replace(/\s+/g, ' ')).toBe('Viewing 1 - 10 of 200');
  });
});
