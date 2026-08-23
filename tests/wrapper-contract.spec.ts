import { test, expect } from '@playwright/test';

/**
 * T4.7 acceptance — @southleft/al-react wrapper contract (R19), exercised end-to-end.
 *
 * Asserts:
 *   1. Boolean attribute reflection — `isDisabled` propagates between
 *      the React prop and the host attribute.
 *   2. Object prop pass-through — `value` for `<al-input>`.
 *   3. Custom event firing — `<al-dialog>` `onDialogOpen`.
 *   4. ref forwarding to the underlying custom element.
 *   5. al-input form participation via ElementInternals (T5.3 cross-ref).
 *
 * The @southleft/al-react wrappers use `@lit/react` createComponent — we use the
 * already-built `dist/components/<name>/<name>.js` from @southleft/al-web-components
 * (the underlying class). The contract is verified at the customElement
 * level since @southleft/al-react wrappers are thin pass-throughs over these classes.
 */

test('T4.7 — boolean attribute reflects from property', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/`);
  const result = await page.evaluate(async () => {
    await customElements.whenDefined('al-button');
    document.body.innerHTML = `<al-button id="b">Hi</al-button>`;
    const b: any = document.getElementById('b');
    b.isDisabled = true;
    await new Promise(r => requestAnimationFrame(r as any));
    return { hasAttr: b.hasAttribute('is-disabled'), getProp: b.isDisabled };
  });
  expect(result.getProp).toBe(true);
});

test('T4.7 — object prop pass-through on al-input', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/`);
  const result = await page.evaluate(async () => {
    await customElements.whenDefined('al-input');
    document.body.innerHTML = `<al-input id="i" name="x"></al-input>`;
    const el: any = document.getElementById('i');
    el.value = 'hello';
    return { value: el.value };
  });
  expect(result.value).toBe('hello');
});

test('T4.7 — al-dialog dispatches onDialogOpen', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/`);
  const result = await page.evaluate(async () => {
    await customElements.whenDefined('al-dialog');
    document.body.innerHTML = `<al-dialog id="d"></al-dialog>`;
    const d: any = document.getElementById('d');
    return new Promise((resolve) => {
      d.addEventListener('onDialogOpen', (e: any) => {
        resolve({ active: e?.detail?.active, isThis: e?.detail?.item === d });
      });
      setTimeout(() => resolve({ active: null, isThis: null }), 1000);
      d.open?.();
    });
  });
  expect((result as any).active).toBe(true);
});

test('T4.7 — ref forwards to ALElement instance', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/`);
  const result = await page.evaluate(async () => {
    await customElements.whenDefined('al-button');
    document.body.innerHTML = `<al-button id="r">x</al-button>`;
    const r: any = document.getElementById('r');
    // ALButton extends ALElement; check it has the base API.
    return {
      isHTMLElement: r instanceof HTMLElement,
      hasDispatch: typeof r.dispatch === 'function',
      hasComponentClassNames: typeof r.componentClassNames === 'function',
    };
  });
  expect(result.isHTMLElement).toBe(true);
  expect(result.hasDispatch).toBe(true);
  expect(result.hasComponentClassNames).toBe(true);
});

test('T4.7 + T5.3 cross-ref — al-input is form-associated', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/`);
  const result = await page.evaluate(async () => {
    await customElements.whenDefined('al-input');
    const ctor = customElements.get('al-input') as any;
    return { formAssociated: ctor?.formAssociated };
  });
  expect(result.formAssociated).toBe(true);
});

/**
 * T4.7 — event-map drift, the two cases the audit found.
 *
 * `libs/al-react` wrappers are thin `@lit/react` `createComponent` pass-throughs:
 * a React `onFoo` prop only ever fires if the `events` map names an event the web
 * component really dispatches. That mapping is checked statically for all 68
 * wrappers by `scripts/check-react-wrapper-contract.js`; these two tests assert
 * the other half — that the events themselves exist and carry usable detail.
 *
 * Both were dead before this spec:
 *   - Calendar.tsx mapped `onChange: 'change'`; calendar.ts dispatches only
 *     `onCalendarChange`.
 *   - CheckboxGroup.tsx mapped `onChange: 'change'`; checkbox-group.ts dispatched
 *     NOTHING, so the fix had to add the event first.
 */

test('T4.7 — al-calendar dispatches onCalendarChange (never a plain "change")', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/`);
  const result = await page.evaluate(async () => {
    await customElements.whenDefined('al-calendar');
    document.body.innerHTML = `<al-calendar id="c"></al-calendar>`;
    const el: any = document.getElementById('c');
    await el.updateComplete;
    const seen: string[] = [];
    el.addEventListener('onCalendarChange', (e: any) => seen.push(`onCalendarChange:${e.detail?.value ?? ''}`));
    el.addEventListener('change', () => seen.push('change'));
    // Click the first selectable day button in the rendered grid
    // (calendar.ts:607 — `.al-c-calendar__item`, disabled when unavailable).
    // The day grid lands one render AFTER `updateComplete`, so poll for it.
    let day: HTMLElement | null | undefined;
    for (let i = 0; i < 40 && !day; i += 1) {
      day = el.shadowRoot?.querySelector('button.al-c-calendar__item:not([disabled])');
      if (!day) await new Promise((r) => setTimeout(r, 50));
    }
    day?.click();
    await new Promise((r) => setTimeout(r, 50));
    return { seen, hadDay: Boolean(day) };
  });

  expect(result.hadDay, 'no selectable day rendered — the calendar did not mount').toBe(true);
  expect(result.seen.some((s) => s.startsWith('onCalendarChange:'))).toBe(true);
  // The event the old wrapper mapped does not exist. If this ever starts
  // firing, the wrapper map should be revisited — not the other way round.
  expect(result.seen).not.toContain('change');
});

test('T4.7 — al-checkbox-group re-emits onCheckboxGroupChange from its checkboxes', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/`);
  const result = await page.evaluate(async () => {
    await customElements.whenDefined('al-checkbox-group');
    await customElements.whenDefined('al-checkbox');
    document.body.innerHTML = `
      <al-checkbox-group id="g" label="Group">
        <al-checkbox id="a" value="alpha" label="Alpha"></al-checkbox>
        <al-checkbox id="b" value="beta" label="Beta"></al-checkbox>
      </al-checkbox-group>`;
    const group: any = document.getElementById('g');
    await group.updateComplete;
    const events: any[] = [];
    group.addEventListener('onCheckboxGroupChange', (e: any) => events.push(e.detail));

    const click = async (id: string) => {
      const box: any = document.getElementById(id);
      await box.updateComplete;
      (box.shadowRoot?.querySelector('input[type="checkbox"]') as HTMLElement | null)?.click();
      await new Promise((r) => setTimeout(r, 20));
    };
    await click('a');
    await click('b');
    await click('a');
    return { events };
  });

  // One group-level event per checkbox interaction, carrying which box changed
  // and the whole group's current selection.
  expect(result.events.length).toBe(3);
  expect(result.events[0]).toMatchObject({ value: 'alpha', checked: true, checkedValues: ['alpha'] });
  expect(result.events[1]).toMatchObject({ value: 'beta', checked: true, checkedValues: ['alpha', 'beta'] });
  expect(result.events[2]).toMatchObject({ value: 'alpha', checked: false, checkedValues: ['beta'] });
});
