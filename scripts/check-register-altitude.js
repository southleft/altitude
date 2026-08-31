#!/usr/bin/env node
/**
 * T4.6 — Smoke test for `registerAltitude` registry modes.
 *
 * Asserts the four behaviors the plan demands:
 *   1. `stable` mode registers a plain tag (`al-foo`).
 *   2. `versioned` mode registers a suffixed tag (`al-foo-1-2-3`).
 *   3. `manual` mode registers nothing, but returns the alias map.
 *   4. dev-mode console diagnostic on tag collision.
 *
 * Runs in Node with a minimal `customElements` polyfill so the registry
 * logic can be exercised without a browser.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const REPO = path.resolve(__dirname, '..');
const SRC = path.join(REPO, 'libs/al-web-components/directives/register.ts');

function failOf(cond, msg) {
  if (!cond) {
    console.error('[registry] FAIL —', msg);
    process.exit(1);
  }
}

function main() {
  // Polyfill customElements.
  global.customElements = (function () {
    const registry = new Map();
    return {
      get: (name) => registry.get(name),
      define: (name, klass) => {
        if (registry.has(name)) throw new Error('already defined');
        registry.set(name, klass);
      },
      _registry: registry,
    };
  })();
  global.process = process;

  // Compile register.ts → CommonJS so we can `require` it directly.
  const tsSource = fs.readFileSync(SRC, 'utf8');
  const out = ts.transpileModule(tsSource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      experimentalDecorators: true,
    },
  });
  const sandbox = { module: { exports: {} }, exports: {}, require, console, process };
  const fn = new Function('module', 'exports', 'require', 'console', 'process', out.outputText);
  fn(sandbox.module, sandbox.module.exports, require, console, process);
  const { registerAltitude } = sandbox.module.exports;
  failOf(typeof registerAltitude === 'function', '`registerAltitude` is not exported');

  class A {}
  class B {}

  // 1. stable
  const m1 = registerAltitude({ mode: 'stable' }, [['al-stable', A]]);
  failOf(m1.get('al-stable') === 'al-stable', '`stable` should register plain tag');
  failOf(customElements.get('al-stable') === A, '`stable` should call customElements.define');

  // 2. versioned
  const m2 = registerAltitude({ mode: 'versioned', suffix: '1.2.3' }, [['al-versioned', A]]);
  failOf(m2.get('al-versioned') === 'al-versioned-1-2-3', '`versioned` should suffix-kebab');
  failOf(customElements.get('al-versioned-1-2-3') === A, '`versioned` should call customElements.define');

  // 3. manual
  const m3 = registerAltitude({ mode: 'manual' }, [['al-manual', A]]);
  failOf(m3.get('al-manual') === 'al-manual', '`manual` should return alias');
  failOf(customElements.get('al-manual') === undefined, '`manual` should NOT call customElements.define');

  // 4. collision diagnostic
  const warnings = [];
  const origWarn = console.warn;
  console.warn = (msg) => warnings.push(String(msg));
  registerAltitude({ mode: 'stable' }, [['al-stable', B]]);
  console.warn = origWarn;
  failOf(
    warnings.some((w) => w.includes('tag collision') && w.includes('al-stable')),
    'dev-mode should warn on tag collision'
  );

  // 5. versioned without suffix should throw in dev.
  try {
    registerAltitude({ mode: 'versioned' }, [['al-no-suffix', A]]);
    failOf(false, '`versioned` without suffix should throw in dev');
  } catch (err) {
    failOf(/requires a non-empty 'suffix'/.test(err.message), 'wrong error message');
  }

  console.log('[registry] PASS — stable/versioned/manual modes + collision diagnostic behave correctly.');
}

main();
