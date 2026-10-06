import { svg } from 'lit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './icon';
import type { ALIcon } from './icon';
import { registerIcons, setIconResolver } from './registry';
import type { AltitudeIconDef } from './types';

/**
 * These tests model the import-order bug: `altitude-web-components` (root)
 * defines <al-icon>, which upgrades every `<al-icon name>` already in the page
 * synchronously, BEFORE `.../icon/lazy` has evaluated and installed its
 * resolver. The icons drew a moment later, but each one had already logged
 * "is not registered and no resolver is installed".
 *
 * Every test uses its own glyph names: the registry and the warn-once set are
 * module singletons, so a name used in one test is already registered (or
 * already warned about) in the next.
 */

const fakeGlyph = (): AltitudeIconDef => ({ v: '0 0 256 256', c: svg`<circle cx="128" cy="128" r="64" />` });

/** Past the deferred missing-glyph check: the next frame, then a macrotask. */
const settle = async () => {
  await new Promise((r) => requestAnimationFrame(() => r(undefined)));
  await new Promise((r) => setTimeout(r, 20));
  await new Promise((r) => requestAnimationFrame(() => r(undefined)));
};

const mount = (name: string) => {
  const el = document.createElement('al-icon') as ALIcon;
  el.setAttribute('name', name);
  document.body.append(el);
  return el;
};

const drawn = (el: ALIcon) => !!el.shadowRoot?.querySelector('svg circle');

let errors: ReturnType<typeof vi.spyOn>;
const mounted: Element[] = [];

beforeEach(() => {
  setIconResolver(undefined);
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  errors.mockRestore();
  setIconResolver(undefined);
  mounted.splice(0).forEach((el) => el.remove());
});

const errorsAbout = (name: string) =>
  errors.mock.calls.filter((args) => String(args[0]).includes(`name="${name}"`));

describe('al-icon missing-glyph diagnostic', () => {
  it('does not log when the resolver is installed after the icon connects (root before lazy)', async () => {
    const el = mount('zz-late-resolver');
    mounted.push(el);
    // Same task, after the element has already connected and synced.
    setIconResolver(async (name) => (name === 'zz-late-resolver' ? fakeGlyph() : undefined));

    await settle();
    await el.updateComplete;

    expect(errorsAbout('zz-late-resolver')).toEqual([]);
    expect(drawn(el), 'the icon draws once the resolver is installed').toBe(true);
  });

  it('draws when the resolver is installed in a later task, without logging', async () => {
    const el = mount('zz-later-task');
    mounted.push(el);
    await new Promise((r) => setTimeout(r, 0));
    setIconResolver(async (name) => (name === 'zz-later-task' ? fakeGlyph() : undefined));

    await settle();
    await el.updateComplete;

    expect(errorsAbout('zz-later-task')).toEqual([]);
    expect(drawn(el)).toBe(true);
  });

  it('does not log when the glyph is registered explicitly right after the icon connects', async () => {
    const el = mount('zz-late-register');
    mounted.push(el);
    registerIcons({ 'zz-late-register': fakeGlyph() });

    await settle();
    await el.updateComplete;

    expect(errorsAbout('zz-late-register')).toEqual([]);
    expect(drawn(el)).toBe(true);
  });

  it('still logs a genuinely missing glyph, once, when no resolver ever arrives', async () => {
    mounted.push(mount('zz-truly-missing'), mount('zz-truly-missing'));

    await settle();

    const calls = errorsAbout('zz-truly-missing');
    expect(calls).toHaveLength(1);
    expect(String(calls[0][0])).toContain('is not registered and no resolver is installed');
  });

  it('logs an unknown name once when a resolver is installed but has no such glyph', async () => {
    setIconResolver(async () => undefined);
    mounted.push(mount('zz-no-such-icon'));

    await settle();

    const calls = errorsAbout('zz-no-such-icon');
    expect(calls).toHaveLength(1);
    expect(String(calls[0][0])).toContain('no such icon');
  });
});
