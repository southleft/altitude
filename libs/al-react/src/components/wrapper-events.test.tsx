/**
 * RUNTIME contract for the whole React layer.
 *
 * Until this file existed, `@lit/react`'s `createComponent` prop-to-listener
 * binding had no runtime assertion anywhere in the repo: the only thing
 * checking the wrappers was scripts/check-react-wrapper-contract.js, a STATIC
 * source parser. Static checking is why two mappings could sit dead in the tree
 * (Calendar mapped an event the component never fires; CheckboxGroup mapped one
 * that did not exist at all) — a parser can compare two strings, it cannot
 * prove a callback runs.
 *
 * Every wrapper is discovered from disk, so a newly generated component is
 * covered the moment it lands; nothing here is a hand-maintained list.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComponentType } from 'react';
import { cleanup, flush, render } from '../__harness__/render';

type WrapperModule = Record<string, unknown>;

const sources = import.meta.glob('./*/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const modules = import.meta.glob('./*/*.tsx', { eager: true }) as Record<string, WrapperModule>;

const isWrapperPath = (p: string) => !p.endsWith('.stories.tsx') && !p.endsWith('.test.tsx') && !p.endsWith('/index.tsx');

/** Pull `events: { reactProp: 'domEvent', ... }` out of a wrapper's source. */
function parseEvents(src: string): Record<string, string> {
  const block = src.match(/events:\s*\{([\s\S]*?)\n\s*\}/);
  if (!block) return {};
  const out: Record<string, string> = {};
  for (const [, prop, dom] of block[1].matchAll(/(?:^|\s)([A-Za-z0-9_]+)\s*:\s*'([^']+)'/g)) {
    out[prop] = dom;
  }
  return out;
}

interface Wrapper {
  name: string;
  file: string;
  Component: ComponentType<any>;
  events: Record<string, string>;
}

const wrappers: Wrapper[] = Object.keys(sources)
  .filter(isWrapperPath)
  .sort()
  .map((file) => {
    const mod = modules[file];
    const [name, Component] = Object.entries(mod).find(([key]) => key.startsWith('AL')) as [string, ComponentType<any>];
    return { name, file, Component, events: parseEvents(sources[file]) };
  });

afterEach(cleanup);

describe('al-react wrapper runtime contract', () => {
  it('discovers every wrapper on disk', () => {
    // A guard against this whole suite silently covering nothing — the exact
    // failure mode the spec's Findings section is about.
    expect(wrappers.length).toBeGreaterThanOrEqual(60);
    expect(wrappers.every((w) => typeof w.Component !== 'undefined')).toBe(true);
  });

  it.each(wrappers.map((w) => [w.name, w] as const))(
    '%s renders an UPGRADED custom element (its tag is really registered)',
    async (_name, wrapper) => {
      const { element } = await render(<wrapper.Component />);
      expect(element, `${wrapper.name} rendered nothing`).toBeTruthy();
      // `localName`, NOT `tagName`: <al-heading> declares
      // `@property() accessor tagName` (heading.ts:39), which SHADOWS
      // Element.prototype.tagName, so `element.tagName` on that one wrapper
      // returns 'h2'. Reported separately; `localName` cannot be shadowed.
      const tag = element.localName;
      const ctor = customElements.get(tag);
      expect(ctor, `${tag} was never defined — register() failed silently`).toBeTruthy();
      // An unregistered tag yields HTMLUnknownElement/HTMLElement, not an
      // instance of the element class. This is what caught the MFE double-
      // registration bug in tests/mfe.spec.ts.
      expect(element instanceof (ctor as CustomElementConstructor)).toBe(true);
    }
  );

  const withEvents = wrappers.filter((w) => Object.keys(w.events).length > 0);

  it('parses the same number of event mappings the static contract check counts', () => {
    // scripts/check-react-wrapper-contract.js independently reports 63 mappings
    // across 68 wrappers. If this parser ever silently stops matching, the
    // per-wrapper suite below would shrink to nothing and still be green — the
    // exact failure mode this spec exists to eliminate.
    const total = withEvents.reduce((n, w) => n + Object.keys(w.events).length, 0);
    expect(withEvents.length).toBe(36);
    expect(total).toBe(63);
  });

  it.each(withEvents.map((w) => [w.name, w] as const))(
    '%s delivers each mapped DOM event to its React prop',
    async (_name, wrapper) => {
      for (const [prop, domEvent] of Object.entries(wrapper.events)) {
        const spy = vi.fn();
        const { element } = await render(<wrapper.Component {...{ [prop]: spy }} />);

        await flush(async () => {
          element.dispatchEvent(new CustomEvent(domEvent, { detail: { probe: true }, bubbles: true, composed: true }));
        });

        expect(spy, `${wrapper.name}: prop \`${prop}\` never fired for '${domEvent}'`).toHaveBeenCalledTimes(1);
        expect((spy.mock.calls[0][0] as CustomEvent).type).toBe(domEvent);
        expect((spy.mock.calls[0][0] as CustomEvent).detail.probe).toBe(true);
        await cleanup();
      }
    }
  );

  it('does not fire a mapped prop for a DIFFERENT event name', async () => {
    // Without this, a wrapper that listened to everything would pass the test
    // above.
    const wrapper = withEvents[0];
    const [prop, domEvent] = Object.entries(wrapper.events)[0];
    const spy = vi.fn();
    const { element } = await render(<wrapper.Component {...{ [prop]: spy }} />);
    await flush(async () => {
      element.dispatchEvent(new CustomEvent(`${domEvent}-not-really`, { bubbles: true, composed: true }));
    });
    expect(spy).not.toHaveBeenCalled();
  });
});
