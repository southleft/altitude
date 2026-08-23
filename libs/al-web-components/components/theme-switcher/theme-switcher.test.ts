import { fixture, html } from '@open-wc/testing-helpers';
import { afterEach, describe, expect, it } from 'vitest';
import './theme-switcher';
import '../theme/theme';
import type { ALThemeSwitcher } from './theme-switcher';

const globalSheet = () => document.querySelector('style#al-tokens-sheet');

afterEach(() => globalSheet()?.remove());

describe('al-theme-switcher', () => {
  it('retargets the nearest <al-theme> ancestor instead of mutating the document', async () => {
    // theme-switcher.ts:113-118 — the scoped path is the whole point of Phase 4:
    // multiple brands must be able to coexist in one document.
    const host = await fixture(html`
      <al-theme brand="altitude" mode="dark"><al-theme-switcher></al-theme-switcher></al-theme>
    `);
    const sw = host.querySelector('al-theme-switcher') as ALThemeSwitcher;
    const events: any[] = [];
    sw.addEventListener('onThemeSwitcherChange', (e) => events.push((e as CustomEvent).detail));

    sw.setTheme('southleft');

    expect(host.getAttribute('brand')).toBe('southleft');
    expect(host.getAttribute('mode')).toBe('dark');
    expect(events[0].scoped).toBe(true);
    expect(events[0].currentTheme).toBe('southleft');
    expect(globalSheet(), 'the scoped path must not touch document.head').toBeNull();
  });

  it('moves mode as well as brand', async () => {
    const host = await fixture(html`<al-theme brand="southleft" mode="dark"><al-theme-switcher></al-theme-switcher></al-theme>`);
    const sw = host.querySelector('al-theme-switcher') as ALThemeSwitcher;
    sw.setTheme('light');
    expect(host.getAttribute('brand')).toBe('altitude');
    expect(host.getAttribute('mode')).toBe('light');
  });

  it('falls back to the deprecated global <style> swap when there is no <al-theme>', async () => {
    const sw = await fixture<ALThemeSwitcher>(html`<al-theme-switcher></al-theme-switcher>`);
    const events: any[] = [];
    sw.addEventListener('onThemeSwitcherChange', (e) => events.push((e as CustomEvent).detail));

    sw.setTheme('light');
    expect(globalSheet()).not.toBeNull();
    expect(globalSheet()!.innerHTML.length).toBeGreaterThan(0);
    expect(events[0].scoped).toBe(false);

    // Swapping again must REPLACE the sheet, not stack a second one.
    sw.setTheme('dark');
    expect(document.querySelectorAll('style#al-tokens-sheet')).toHaveLength(1);
  });

  it('suppresses the global swap when scopedOnly is set', async () => {
    const sw = await fixture<ALThemeSwitcher>(html`<al-theme-switcher></al-theme-switcher>`);
    sw.scopedOnly = true;
    sw.setTheme('dark');
    expect(globalSheet()).toBeNull();
  });

  it('ignores an unknown brand key entirely', async () => {
    const host = await fixture(html`<al-theme brand="altitude" mode="dark"><al-theme-switcher></al-theme-switcher></al-theme>`);
    const sw = host.querySelector('al-theme-switcher') as ALThemeSwitcher;
    let fired = 0;
    sw.addEventListener('onThemeSwitcherChange', () => fired++);

    (sw as any).setTheme('does-not-exist');

    expect(fired).toBe(0);
    expect(host.getAttribute('brand')).toBe('altitude');
  });

  it('renders one menu item per configured brand and applies the one clicked', async () => {
    const host = await fixture(html`<al-theme brand="altitude" mode="dark"><al-theme-switcher></al-theme-switcher></al-theme>`);
    const sw = host.querySelector('al-theme-switcher') as ALThemeSwitcher;
    await sw.updateComplete;

    const items = [...sw.shadowRoot!.querySelectorAll('al-menu-item')];
    expect(items.map((i) => i.textContent!.trim())).toEqual(['Theme: Dark', 'Theme: Light', 'Brand: Southleft']);

    (items[2] as HTMLElement).click();
    expect(host.getAttribute('brand')).toBe('southleft');
  });
});
