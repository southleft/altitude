import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import './accordion-panel';
import type { ALAccordionPanel } from './accordion-panel';

const button = (el: ALAccordionPanel) => el.shadowRoot!.querySelector('button') as HTMLButtonElement;
const region = (el: ALAccordionPanel) => el.shadowRoot!.querySelector('[role="region"]') as HTMLElement;

const panel = (attrs = '') =>
  fixture<ALAccordionPanel>(html`
    <al-accordion-panel ...="${attrs}"><span slot="header">Shipping</span><p>Body copy</p></al-accordion-panel>
  `);

describe('al-accordion-panel', () => {
  it('wires the header button and the region to each other in BOTH directions', async () => {
    const el = await panel();
    await el.updateComplete;

    expect(button(el).getAttribute('aria-controls')).toBe(region(el).id);
    expect(region(el).getAttribute('aria-labelledby')).toBe(button(el).id);
    expect(button(el).id).toBeTruthy();
    expect(region(el).id).toBeTruthy();
    expect(button(el).id).not.toBe(region(el).id);
  });

  it('generates ids that do not collide between two panels on one page', async () => {
    const a = await panel();
    const b = await panel();
    await a.updateComplete;
    await b.updateComplete;
    expect(button(a).id).not.toBe(button(b).id);
    expect(region(a).id).not.toBe(region(b).id);
  });

  it('reports its expanded state and keeps it in step with isActive', async () => {
    const el = await panel();
    await el.updateComplete;
    expect(button(el).getAttribute('aria-expanded')).toBe('false');

    button(el).click();
    await el.updateComplete;
    expect(el.isActive).toBe(true);
    expect(button(el).getAttribute('aria-expanded')).toBe('true');

    button(el).click();
    await el.updateComplete;
    expect(el.isActive).toBe(false);
    expect(button(el).getAttribute('aria-expanded')).toBe('false');
  });

  it('exposes a real <button>, not a clickable div', async () => {
    const el = await panel();
    await el.updateComplete;
    expect(button(el).tagName).toBe('BUTTON');
    expect(button(el).disabled).toBe(false);
  });

  it('does not toggle when disabled', async () => {
    const el = await fixture<ALAccordionPanel>(html`
      <al-accordion-panel isDisabled><span slot="header">Shipping</span><p>Body</p></al-accordion-panel>
    `);
    await el.updateComplete;
    expect(button(el).disabled).toBe(true);
    button(el).click();
    await el.updateComplete;
    expect(el.isActive).toBeFalsy();
  });
});
