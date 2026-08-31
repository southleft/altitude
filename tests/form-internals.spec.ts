import { test, expect } from '@playwright/test';

/**
 * T5.3 — form-associated participation via ElementInternals.
 *
 * Asserts:
 *   1. `<al-input>` participates in a real `<form>` (FormData carries the value).
 *   2. setValidity() surfaces invalid state via the constraint validation API.
 *   3. Submitting the form receives the input's value under its `name`.
 */

test('T5.3 — al-input is form-associated (FormData carries the value)', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/`);
  const result = await page.evaluate(async () => {
    // Wait for al-input to be registered (apps/web-components fixture loaded it).
    await customElements.whenDefined('al-input');
    document.body.innerHTML = `
      <form id="f">
        <al-input name="email" value="hi@example.com"></al-input>
        <button id="b">go</button>
      </form>
    `;
    const input: any = document.querySelector('al-input');
    // Mirror the value into form-internals like the change handler does.
    input.formInternals?.setValue?.('hi@example.com');
    const fd = new FormData(document.getElementById('f') as HTMLFormElement);
    return { entry: fd.get('email'), hasFormProperty: 'formAssociated' in (input.constructor as any) };
  });
  expect(result.hasFormProperty).toBe(true);
  expect(result.entry).toBe('hi@example.com');
});

test('T5.3 — al-input.setValidity flips internals.validity', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/`);
  const result = await page.evaluate(async () => {
    await customElements.whenDefined('al-input');
    document.body.innerHTML = `
      <form id="f"><al-input name="x"></al-input></form>
    `;
    const input: any = document.querySelector('al-input');
    input.formInternals?.setValidity?.({ valueMissing: true }, 'required');
    return {
      valid: input.formInternals?.validity?.valid ?? null,
      valueMissing: input.formInternals?.validity?.valueMissing ?? null,
    };
  });
  expect(result.valid).toBe(false);
  expect(result.valueMissing).toBe(true);
});

test('T5.3 — al-input <-> form integration: submit picks up value', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/`);
  const captured = await page.evaluate(async () => {
    await customElements.whenDefined('al-input');
    document.body.innerHTML = `
      <form id="f">
        <al-input name="q" value="hello"></al-input>
        <button type="submit" id="go">go</button>
      </form>
    `;
    const input: any = document.querySelector('al-input');
    input.formInternals?.setValue?.('hello');
    return new Promise<string | null>((resolve) => {
      document.getElementById('f')!.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target as HTMLFormElement);
        resolve(fd.get('q') as string | null);
      });
      (document.getElementById('go') as HTMLButtonElement).click();
    });
  });
  expect(captured).toBe('hello');
});
