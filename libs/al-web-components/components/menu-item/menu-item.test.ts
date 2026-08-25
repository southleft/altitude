import { fixture, html } from '@open-wc/testing-helpers';
import { userEvent } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import './menu-item';
import type { ALMenuItem } from './menu-item';

const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

/**
 * The node that actually takes the click.
 *
 * An item WITH an href renders an `<al-link>` and the real anchor lives in
 * *its* shadow root; a header WITHOUT an href renders a plain
 * `<div class="al-c-menu-item__link">` with no nested shadow root at all
 * (menu-item.ts:398-412). Reaching blindly for `.shadowRoot.querySelector('*')`
 * throws on the second kind — the same trap the menu stories had to work
 * around, so it is encoded here once.
 */
const linkTarget = (el: ALMenuItem): HTMLElement => {
  const link = el.shadowRoot!.querySelector('.al-c-menu-item__link') as HTMLElement;
  return (link.shadowRoot ? (link.shadowRoot.querySelector('a, button') as HTMLElement) : link) ?? link;
};

const control = (el: ALMenuItem) => el.shadowRoot!.querySelector('.al-c-menu-item__control') as HTMLElement;

/**
 * Mount an item inside a container that swallows the anchor's default action.
 *
 * An item with an `href` renders a REAL `<a href>`, and a real pointer click on
 * one navigates the Vitest browser iframe away mid-test — the run then hangs
 * rather than failing, which is a miserable thing to debug. Cancelling the
 * default at the container (the click bubbles out of the shadow root because it
 * is composed) keeps the click genuine while pinning the page in place.
 */
async function mount(markup: unknown) {
  const host = await fixture<HTMLElement>(
    html`<div @click=${(e: Event) => e.preventDefault()}>${markup}</div>`
  );
  const el = host.querySelector('al-menu-item') as ALMenuItem;
  await el.updateComplete;
  await tick();
  return el;
}

describe('al-menu-item', () => {
  it('selects itself on click and reports it through onMenuItemSelect', async () => {
    // Ported from menu-item.stories.ts Default.
    const el = await mount(html`<al-menu-item href="/a" value="a">A</al-menu-item>`);
    const seen: unknown[] = [];
    el.addEventListener('onMenuItemSelect', (e) => seen.push((e as CustomEvent).detail));

    await userEvent.click(linkTarget(el));
    await el.updateComplete;

    expect(el.isSelected).toBe(true);
    expect(seen).toEqual([{ value: 'a', selected: true, item: el }]);
  });

  it('does not re-announce a selection it already has', async () => {
    // menu-item.ts:334 gates on `!this.isSelected`. <al-menu> listens for
    // onMenuItemSelect to clear the PREVIOUS item; a duplicate event for the
    // item that is already current would make it clear itself.
    const el = await mount(html`<al-menu-item href="/a" value="a">A</al-menu-item>`);
    let fired = 0;
    el.addEventListener('onMenuItemSelect', () => fired++);

    await userEvent.click(linkTarget(el));
    await userEvent.click(linkTarget(el));
    await el.updateComplete;

    expect(el.isSelected).toBe(true);
    expect(fired).toBe(1);
  });

  it('refuses to select while disabled', async () => {
    const el = await mount(html`<al-menu-item href="/a" value="a" isDisabled>A</al-menu-item>`);
    let fired = 0;
    el.addEventListener('onMenuItemSelect', () => fired++);

    el.setSelected();
    await el.updateComplete;
    expect(el.isSelected).toBeFalsy();
    expect(fired).toBe(0);
  });

  it('expands and collapses a group header through its control button', async () => {
    // Ported from menu-item.stories.ts HeaderGroup.
    const el = await mount(html`<al-menu-item isHeader groupId="grp-1" value="grp">Group</al-menu-item>`);
    const seen: boolean[] = [];
    el.addEventListener('onMenuItemExpand', (e) => seen.push((e as CustomEvent).detail.expanded));

    expect(control(el), 'a header with a groupId must render an expand control').not.toBeNull();

    await userEvent.click(control(el));
    await el.updateComplete;
    expect(el.isExpanded).toBe(true);

    await userEvent.click(control(el));
    await el.updateComplete;
    expect(el.isExpanded).toBe(false);
    expect(seen).toEqual([true, false]);
  });

  it('renders no expand control for a header that owns no group', async () => {
    // menu-item.ts:433 requires BOTH `isHeader` and `groupId`. A control with
    // nothing to expand is a dead button in the tab order.
    const el = await mount(html`<al-menu-item isHeader value="h">Heading</al-menu-item>`);
    expect(control(el)).toBeNull();

    el.toggleExpanded();
    await el.updateComplete;
    expect(el.isExpanded, 'toggleExpanded must be inert without a groupId').toBeFalsy();
  });

  it('renders a header without an href as a plain div, not an al-link', async () => {
    // menu-item.ts:398 — an <a> with no href is not focusable and announces as
    // a generic element, so a hrefless header deliberately renders a div with
    // tabindex="-1" instead.
    const el = await mount(html`<al-menu-item isHeader value="h">Heading</al-menu-item>`);
    const link = el.shadowRoot!.querySelector('.al-c-menu-item__link') as HTMLElement;

    expect(link.tagName.toLowerCase()).toBe('div');
    expect(link.className).toContain('al-c-menu-item--no-href');
    expect(link.getAttribute('tabindex')).toBe('-1');
    expect(link.shadowRoot, 'there is no nested shadow root to reach into').toBeNull();
  });

  it('hides a collapsed group child through the al-is-hidden class', async () => {
    const el = await mount(html`<al-menu-item href="/a" isHidden>A</al-menu-item>`);
    expect(el.shadowRoot!.querySelector('li')!.className).toContain('al-is-hidden');
  });
});
