import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import './button';
import '../icon/icons/success';
import '../icon/icons/send';
import type { ALButton } from './button';

const q = (el: ALButton, sel: string) => el.shadowRoot!.querySelector(sel);

describe('al-button', () => {
  it('renders a <button> by default and an <a role="button"> when href is set', async () => {
    const plain = await fixture<ALButton>(html`<al-button>Save</al-button>`);
    expect(q(plain, 'a')).toBeNull();
    expect(q(plain, 'button')).not.toBeNull();

    const link = await fixture<ALButton>(html`<al-button href="/docs" target="_blank">Docs</al-button>`);
    const anchor = q(link, 'a') as HTMLAnchorElement;
    expect(q(link, 'button')).toBeNull();
    expect(anchor.getAttribute('href')).toBe('/docs');
    expect(anchor.getAttribute('role')).toBe('button');
    expect(anchor.getAttribute('target')).toBe('_blank');
  });

  it('derives the accessible name from slotted text when no label is given', async () => {
    // button.ts:148-158 — connectedCallback reads the first text node out of
    // the default slot after a 10ms tick and assigns it to `label`.
    const el = await fixture<ALButton>(html`<al-button>  Save changes  </al-button>`);
    await new Promise((r) => setTimeout(r, 40));
    await el.updateComplete;
    expect(el.label).toBe('Save changes');
    expect(q(el, 'button')!.getAttribute('aria-label')).toBe('Save changes');
  });

  it('does not overwrite an explicit label with the slotted text', async () => {
    const el = await fixture<ALButton>(html`<al-button label="Open actions menu">Menu</al-button>`);
    await new Promise((r) => setTimeout(r, 40));
    await el.updateComplete;
    expect(el.label).toBe('Open actions menu');
  });

  it('visually hides the text but keeps it in the accessibility tree when hideText is set', async () => {
    const el = await fixture<ALButton>(html`<al-button hideText label="Actions">Actions</al-button>`);
    const text = q(el, '.al-c-button__text')!;
    expect(text.className).toContain('al-u-is-vishidden');
    // The node is still rendered — hiding it with `display:none` would remove
    // the name from the a11y tree, which is the whole point of the pattern.
    expect(text.textContent).not.toBeNull();
    expect(q(el, 'button')!.getAttribute('aria-label')).toBe('Actions');
    expect(q(el, '.al-c-button')!.className).toContain('al-c-button--icon-only');
  });

  it('submits the closest form when type="submit" is clicked', async () => {
    // button.ts:135-140 + controllers/form.ts:19-28. This is the assertion that
    // proves the FormController is wired: a shadow-DOM <button type=submit>
    // does NOT submit an ancestor light-DOM form on its own.
    const form = await fixture<HTMLFormElement>(html`
      <form @submit=${(e: Event) => e.preventDefault()}>
        <al-button type="submit">Go</al-button>
      </form>
    `);
    let submits = 0;
    form.addEventListener('submit', () => submits++);
    (form.querySelector('al-button') as ALButton).shadowRoot!.querySelector('button')!.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(submits).toBe(1);
  });

  it('resets the closest form when type="reset" is clicked', async () => {
    const form = await fixture<HTMLFormElement>(html`
      <form>
        <input name="a" />
        <al-button type="reset">Reset</al-button>
      </form>
    `);
    const input = form.querySelector('input') as HTMLInputElement;
    input.value = 'dirty';
    (form.querySelector('al-button') as ALButton).shadowRoot!.querySelector('button')!.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(input.value).toBe('');
  });

  it('does not submit the form for the default (non-submit) type', async () => {
    const form = await fixture<HTMLFormElement>(html`
      <form @submit=${(e: Event) => e.preventDefault()}>
        <al-button>Go</al-button>
      </form>
    `);
    let submits = 0;
    form.addEventListener('submit', () => submits++);
    (form.querySelector('al-button') as ALButton).shadowRoot!.querySelector('button')!.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(submits).toBe(0);
  });

  it('does not submit the form when an isAriaDisabled submit button is clicked', async () => {
    // isAriaDisabled leaves the inner <button> enabled (so it stays focusable),
    // which means the browser DOES dispatch the click. handleOnClick's disabled
    // guard is the only thing that stops FormController.submit().
    const form = await fixture<HTMLFormElement>(html`
      <form @submit=${(e: Event) => e.preventDefault()}>
        <al-button type="submit" isAriaDisabled>Go</al-button>
      </form>
    `);
    let submits = 0;
    form.addEventListener('submit', () => submits++);
    const button = (form.querySelector('al-button') as ALButton).shadowRoot!.querySelector('button')!;
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    button.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(submits).toBe(0);
  });

  it('does not reset the form when an isAriaDisabled reset button is clicked', async () => {
    const form = await fixture<HTMLFormElement>(html`
      <form>
        <input name="a" />
        <al-button type="reset" isAriaDisabled>Reset</al-button>
      </form>
    `);
    const input = form.querySelector('input') as HTMLInputElement;
    input.value = 'dirty';
    (form.querySelector('al-button') as ALButton).shadowRoot!.querySelector('button')!.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(input.value).toBe('dirty');
  });

  it('cancels navigation when a link-mode button is isDisabled', async () => {
    // An <a> has no native `disabled`, so handleOnLinkClick must cancel the
    // default action. A fragment href keeps the test runner's page in place
    // even if the guard regresses — the failure shows up as a changed hash.
    const before = window.location.hash;
    const el = await fixture<ALButton>(html`<al-button href="#al-button-disabled-nav" isDisabled>Docs</al-button>`);
    const anchor = q(el, 'a') as HTMLAnchorElement;
    expect(anchor.getAttribute('aria-disabled')).toBe('true');
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true });
    try {
      anchor.dispatchEvent(click);
      await new Promise((r) => setTimeout(r, 0));
      expect(click.defaultPrevented).toBe(true);
      expect(window.location.hash).toBe(before);
    } finally {
      if (window.location.hash !== before) history.replaceState(null, '', before || window.location.pathname + window.location.search);
    }
  });

  it('still sets native disabled on the inner <button> when isDisabled is set', async () => {
    // The click guard must not replace native `disabled`: it is what removes
    // the button from the tab order and what assistive tech reads as disabled.
    const el = await fixture<ALButton>(html`<al-button isDisabled>Save</al-button>`);
    const button = q(el, 'button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('maps each variant to its own modifier class and nothing else', async () => {
    for (const [variant, cls] of [
      ['secondary', 'al-c-button--secondary'],
      ['tertiary', 'al-c-button--tertiary'],
      ['bare', 'al-c-button--bare'],
      ['neutral', 'al-c-button--neutral'],
    ] as const) {
      const el = await fixture<ALButton>(html`<al-button variant=${variant}>x</al-button>`);
      const className = q(el, '.al-c-button')!.className;
      expect(className, variant).toContain(cls);
      const others = ['secondary', 'tertiary', 'bare', 'neutral'].filter((v) => v !== variant);
      for (const other of others) expect(className, `${variant} must not carry --${other}`).not.toContain(`al-c-button--${other}`);
    }
  });

  it('appends styleModifier to the rendered class list', async () => {
    const el = await fixture<ALButton>(html`<al-button styleModifier="al-u-mt-sm">x</al-button>`);
    expect(q(el, '.al-c-button')!.className).toContain('al-u-mt-sm');
  });

  it('renders the icon wrapper only for the slot that is actually filled', async () => {
    // Ported from button.stories.ts DefaultIconBefore / DefaultIconAfter, which
    // only checked that a slotted icon rendered its own glyph. The assertion
    // that matters here is button.ts:184-188: each wrapper is gated on
    // `slotNotEmpty()`, so an unfilled slot must render NO `__icon` box — an
    // empty one still occupies the button's gap.
    const before = await fixture<ALButton>(html`
      <al-button><al-icon-success slot="before"></al-icon-success>Label</al-button>
    `);
    await before.updateComplete;
    await new Promise((r) => setTimeout(r, 40));
    const beforeIcons = [...before.shadowRoot!.querySelectorAll('.al-c-button__icon')];
    expect(beforeIcons).toHaveLength(1);
    expect(beforeIcons[0].querySelector('slot')!.getAttribute('name')).toBe('before');
    expect(
      (beforeIcons[0].querySelector('slot') as HTMLSlotElement).assignedElements()[0].tagName.toLowerCase()
    ).toBe('al-icon-success');

    const after = await fixture<ALButton>(html`
      <al-button>Label<al-icon-send slot="after"></al-icon-send></al-button>
    `);
    await after.updateComplete;
    await new Promise((r) => setTimeout(r, 40));
    const afterIcons = [...after.shadowRoot!.querySelectorAll('.al-c-button__icon')];
    expect(afterIcons).toHaveLength(1);
    expect(afterIcons[0].querySelector('slot')!.getAttribute('name')).toBe('after');
  });

  it('renders no icon wrapper at all when neither slot is filled', async () => {
    const el = await fixture<ALButton>(html`<al-button>Label</al-button>`);
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 40));
    expect(el.shadowRoot!.querySelectorAll('.al-c-button__icon')).toHaveLength(0);
  });
});
