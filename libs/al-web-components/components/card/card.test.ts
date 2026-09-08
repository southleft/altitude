import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import './card';
import '../avatar/avatar';
import '../calendar/calendar';
import type { ALCard } from './card';
import type { ALAvatar } from '../avatar/avatar';
import type { ALCalendar } from '../calendar/calendar';

describe('documented content slots', () => {
  it('keeps a card action visible and operable without a header', async () => {
    const el = await fixture<ALCard>(html`<al-card><button slot="action-right">Actions</button>Body</al-card>`);
    await el.updateComplete;
    const action = el.querySelector('button')!;
    expect(action.assignedSlot?.name).toBe('action-right');
    expect(action.getBoundingClientRect().width).toBeGreaterThan(0);
    action.focus();
    expect(document.activeElement).toBe(action);
  });

  it('projects an avatar badge override only when the badge is enabled', async () => {
    const el = await fixture<ALAvatar>(html`<al-avatar hasBadge>A<span slot="badge">Online</span></al-avatar>`);
    await el.updateComplete;
    const badge = el.querySelector('span')!;
    expect(badge.assignedSlot?.name).toBe('badge');
    el.hasBadge = false;
    await el.updateComplete;
    expect(badge.assignedSlot).toBeNull();
  });

  it('projects distinct previous and next calendar icons', async () => {
    const el = await fixture<ALCalendar>(html`<al-calendar><span slot="before">Previous icon</span><span slot="after">Next icon</span></al-calendar>`);
    await el.updateComplete;
    const icons = el.querySelectorAll('span');
    expect(icons[0].assignedSlot?.name).toBe('before');
    expect(icons[1].assignedSlot?.name).toBe('after');
    expect(icons[0].assignedSlot).not.toBe(icons[1].assignedSlot);
  });
});
