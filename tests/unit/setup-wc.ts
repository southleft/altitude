/**
 * Setup for the `wc` unit project.
 *
 * 1. `alAutoRegistry`. Every component module ends with
 *    `if (globalThis.alAutoRegistry === true && !customElements.get(el)) define(...)`
 *    (components/button/button.ts:216). The flag is read at MODULE EVAL time,
 *    so it has to be set before the first component import - which a setupFile
 *    guarantees and an in-test assignment would not.
 *
 * 2. The global token bundle. Component styles ship inside each shadow root via
 *    `unsafeCSS`, but every one of them reads `var(--al-*)` values that only
 *    exist on `:root`. Without it components lay out at collapsed sizes and a
 *    real pointer click has no hit target to land on.
 */
import { afterEach } from 'vitest';
import '../../libs/al-web-components/styles/main.scss';
import { fixtureCleanup } from '@open-wc/testing-helpers';

(globalThis as any).alAutoRegistry = true;

afterEach(() => {
  fixtureCleanup();
});
