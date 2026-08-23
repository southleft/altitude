import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import './button';
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

  it('maps each variant to its own modifier class and nothing else', async () => {
    for (const [variant, cls] of [
      ['secondary', 'al-c-button--secondary'],
      ['tertiary', 'al-c-button--tertiary'],
      ['bare', 'al-c-button--bare'],
      ['danger', 'al-c-button--danger'],
    ] as const) {
      const el = await fixture<ALButton>(html`<al-button variant=${variant}>x</al-button>`);
      const className = q(el, '.al-c-button')!.className;
      expect(className, variant).toContain(cls);
      const others = ['secondary', 'tertiary', 'bare', 'danger'].filter((v) => v !== variant);
      for (const other of others) expect(className, `${variant} must not carry --${other}`).not.toContain(`al-c-button--${other}`);
    }
  });

  it('appends styleModifier to the rendered class list', async () => {
    const el = await fixture<ALButton>(html`<al-button styleModifier="al-u-mt-sm">x</al-button>`);
    expect(q(el, '.al-c-button')!.className).toContain('al-u-mt-sm');
  });
});
