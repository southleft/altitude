import { fixture, html } from '@open-wc/testing-helpers';
import { userEvent } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import './focus-trap';
import type { ALFocusTrap } from './focus-trap';

const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

async function trapWith(markup: ReturnType<typeof html>) {
  const el = await fixture<ALFocusTrap>(markup);
  await el.updateComplete;
  await tick();
  return el;
}

describe('al-focus-trap', () => {
  it('sends initial focus to the first focusable element when it activates', async () => {
    await trapWith(html`
      <al-focus-trap isActive transitionDelay="0">
        <div><button id="a">A</button><button id="b">B</button></div>
      </al-focus-trap>
    `);
    expect(document.activeElement!.id).toBe('a');
  });

  it('prefers the .al-is-selected item for initial focus', async () => {
    // focus-trap.ts:163-166 — the class marks the item that should RECEIVE
    // focus; it is deliberately not part of the focusable selector.
    await trapWith(html`
      <al-focus-trap isActive transitionDelay="0">
        <div>
          <button id="a">A</button>
          <button id="b" class="al-is-selected">B</button>
          <button id="c">C</button>
        </div>
      </al-focus-trap>
    `);
    expect(document.activeElement!.id).toBe('b');
  });

  it('does nothing at all while inactive', async () => {
    const el = await trapWith(html`
      <al-focus-trap transitionDelay="0">
        <div><button id="a">A</button><button id="b">B</button></div>
      </al-focus-trap>
    `);
    const after = el.parentElement!.querySelector('#outside') as HTMLElement | null;
    expect(after).toBeNull();
    expect(document.activeElement!.id).not.toBe('a');

    (el.querySelector('#b') as HTMLElement).focus();
    await userEvent.tab(); // must NOT be wrapped back to #a
    expect(document.activeElement!.id).not.toBe('a');
  });

  it('wraps Tab from the last element back to the first', async () => {
    const el = await trapWith(html`
      <al-focus-trap isActive transitionDelay="0">
        <div><button id="a">A</button><button id="b">B</button></div>
      </al-focus-trap>
    `);
    (el.querySelector('#b') as HTMLElement).focus();
    await userEvent.tab();
    expect(document.activeElement!.id).toBe('a');
  });

  it('wraps Shift+Tab from the first element to the LIVE last element', async () => {
    // The staleness regression: the trap used to snapshot first/last when it
    // opened and hang listeners on those two nodes, so content that appeared
    // afterwards was outside the boundary. Here #c is added after activation —
    // Shift+Tab from #a must land on #c, not on the #b that was last at open.
    const el = await trapWith(html`
      <al-focus-trap isActive transitionDelay="0">
        <div><button id="a">A</button><button id="b">B</button></div>
      </al-focus-trap>
    `);
    const late = document.createElement('button');
    late.id = 'c';
    late.textContent = 'C';
    el.querySelector('div')!.append(late);
    await tick();

    (el.querySelector('#a') as HTMLElement).focus();
    await userEvent.tab({ shift: true });
    expect(document.activeElement!.id).toBe('c');
    expect(el.lastFocusableEl.id).toBe('c');
  });

  it('wraps Tab from an element that became last after activation', async () => {
    const el = await trapWith(html`
      <al-focus-trap isActive transitionDelay="0">
        <div><button id="a">A</button><button id="b">B</button></div>
      </al-focus-trap>
    `);
    const late = document.createElement('button');
    late.id = 'c';
    el.querySelector('div')!.append(late);
    await tick();

    (el.querySelector('#c') as HTMLElement).focus();
    await userEvent.tab();
    expect(document.activeElement!.id).toBe('a');
  });

  it('re-opens the boundary at the live edge after content is REMOVED', async () => {
    const el = await trapWith(html`
      <al-focus-trap isActive transitionDelay="0">
        <div><button id="a">A</button><button id="b">B</button><button id="c">C</button></div>
      </al-focus-trap>
    `);
    el.querySelector('#c')!.remove();
    await tick();

    (el.querySelector('#b') as HTMLElement).focus();
    await userEvent.tab();
    expect(document.activeElement!.id).toBe('a');
  });

  it('makes the content itself focusable when nothing inside is', async () => {
    const el = await trapWith(html`
      <al-focus-trap isActive transitionDelay="0"><div id="body">Just text</div></al-focus-trap>
    `);
    const body = el.querySelector('#body') as HTMLElement;
    expect(body.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(body);
  });

  it('leaves keys other than Tab alone', async () => {
    const el = await trapWith(html`
      <al-focus-trap isActive transitionDelay="0">
        <div><button id="a">A</button><button id="b">B</button></div>
      </al-focus-trap>
    `);
    (el.querySelector('#b') as HTMLElement).focus();
    const evt = new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true, composed: true, cancelable: true });
    el.querySelector('#b')!.dispatchEvent(evt);
    expect(evt.defaultPrevented).toBe(false);
    expect(document.activeElement!.id).toBe('b');
  });
});
