/**
 * Minimal React 19 render harness for the wrapper tests.
 *
 * Deliberately not @testing-library/react: the thing under test is the
 * `@lit/react` custom-element binding, and a library that queries by role or
 * text would add a layer of interpretation between the assertion and the DOM
 * event actually being checked.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactElement } from 'react';

export interface Mounted {
  /** The container the React root renders into. */
  host: HTMLElement;
  /** The custom element the wrapper rendered. */
  element: HTMLElement & Record<string, any>;
  rerender(node: ReactElement): Promise<void>;
}

const mounted: Array<{ root: Root; host: HTMLElement }> = [];

export async function render(node: ReactElement): Promise<Mounted> {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  mounted.push({ root, host });
  await act(async () => {
    root.render(node);
  });
  return {
    host,
    element: host.firstElementChild as HTMLElement & Record<string, any>,
    async rerender(next: ReactElement) {
      await act(async () => {
        root.render(next);
      });
    },
  };
}

export async function cleanup() {
  for (const { root, host } of mounted.splice(0)) {
    await act(async () => root.unmount());
    host.remove();
  }
}

/** Flush React work triggered from OUTSIDE React (a custom-element event). */
export async function flush(fn: () => void | Promise<void>) {
  await act(async () => {
    await fn();
  });
}

export const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));
