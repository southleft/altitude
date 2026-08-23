import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import getFocusableElements from './getFocusableElements';

const ids = (root: HTMLElement) => getFocusableElements(root).map((el) => el.id);

describe('getFocusableElements', () => {
  it('collects the real focusable controls in document order', async () => {
    const root = await fixture<HTMLElement>(html`
      <div>
        <a id="link" href="#x">link</a>
        <button id="btn">btn</button>
        <input id="field" />
        <span id="plain">not focusable</span>
      </div>
    `);
    expect(ids(root)).toEqual(['link', 'btn', 'field']);
  });

  it('does not treat .al-is-selected as focusable', async () => {
    // It is a STATE class. Including it matched plain <div>/<span> carriers,
    // which then became the first/last boundary of a focus trap and could not
    // actually be focused. See the header of getFocusableElements.ts.
    const root = await fixture<HTMLElement>(html`
      <div>
        <div id="marker" class="al-is-selected">selected but not focusable</div>
        <button id="btn">btn</button>
      </div>
    `);
    expect(ids(root)).toEqual(['btn']);
  });

  it('skips a subtree the browser has marked inert', async () => {
    const root = await fixture<HTMLElement>(html`
      <div>
        <button id="live">live</button>
        <div inert><button id="frozen">frozen</button></div>
      </div>
    `);
    expect(ids(root)).toEqual(['live']);
  });

  it('skips disabled controls and tabindex="-1"', async () => {
    const root = await fixture<HTMLElement>(html`
      <div>
        <button id="ok">ok</button>
        <button id="off" disabled>off</button>
        <div id="programmatic" tabindex="-1">programmatic only</div>
        <div id="roving" tabindex="0">roving</div>
      </div>
    `);
    expect(ids(root)).toEqual(['ok', 'roving']);
  });

  it('skips controls that are not visible', async () => {
    const root = await fixture<HTMLElement>(html`
      <div>
        <button id="shown">shown</button>
        <button id="hidden" style="display:none">hidden</button>
        <button id="invisible" style="visibility:hidden">invisible</button>
        <button id="transparent" style="opacity:0">transparent</button>
      </div>
    `);
    expect(ids(root)).toEqual(['shown']);
  });

  it('descends through shadow roots and slot assignments', async () => {
    await import('../components/button/button');
    const root = await fixture<HTMLElement>(html`
      <div><al-button id="wc">Save</al-button></div>
    `);
    await (root.querySelector('al-button') as any).updateComplete;
    const found = getFocusableElements(root);
    // The focusable node is the <button> INSIDE al-button's shadow root.
    expect(found.map((el) => el.tagName.toLowerCase())).toEqual(['button']);
    expect(found[0].getRootNode()).not.toBe(document);
  });
});
