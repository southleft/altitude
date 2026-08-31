#!/usr/bin/env node
/**
 * T5.1 — Unit tests for the headless behavior controllers.
 *
 * Verifies each controller's state transitions independently of any styled
 * component. Uses a minimal `host` mock that satisfies
 * ReactiveControllerHost + HTMLElement enough for the controllers to drive.
 *
 * Plan acceptance:
 *   - Behavior is unit-tested independently of styling.
 *   - ≥3 complex components refactored.
 *   - Atoms show no diff.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const REPO = path.resolve(__dirname, '..');
const CTRL_DIR = path.join(REPO, 'libs/al-web-components/controllers');
const FILES = ['dialog', 'menu', 'tooltip', 'tabs'];

function loadModule(name) {
  const src = fs.readFileSync(path.join(CTRL_DIR, `${name}.ts`), 'utf8');
  // Strip the type-only `import type { … } from 'lit'` line.
  const stripped = src.replace(/^import\s+type\s+\{[^}]+\}\s+from\s+['"]lit['"];?\s*$/m, '');
  const out = ts.transpileModule(stripped, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });
  const sandbox = { module: { exports: {} }, exports: {}, require, console };
  const fn = new Function('module', 'exports', 'require', 'console', out.outputText);
  fn(sandbox.module, sandbox.module.exports, require, console);
  return sandbox.module.exports;
}

class FakeHost {
  constructor() {
    this.controllers = [];
    this.updates = 0;
    this.listeners = new Map();
    this.events = [];
  }
  addController(c) { this.controllers.push(c); }
  requestUpdate() { this.updates++; }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }
  removeEventListener(type, fn) {
    this.listeners.set(type, (this.listeners.get(type) || []).filter((f) => f !== fn));
  }
  dispatchEvent(ev) { this.events.push(ev); return true; }
  emit(type, evt) { (this.listeners.get(type) || []).forEach((fn) => fn(evt)); }
  querySelectorAll() { return []; }
}

function expect(cond, msg) {
  if (!cond) { console.error('[controllers] FAIL —', msg); process.exit(1); }
}

function testDialog() {
  const mod = loadModule('dialog');
  const host = new FakeHost();
  // Stub document handlers so the controller can hook them.
  global.document = global.document || {};
  global.document.addEventListener = global.document.addEventListener || (() => {});
  global.document.removeEventListener = global.document.removeEventListener || (() => {});
  global.document.activeElement = null;
  const ctrl = new mod.DialogController(host, { closeOnEscape: false, closeOnClickOutside: false });
  ctrl.hostConnected();
  ctrl.open();
  expect(host.isActive === true, 'dialog: open should set isActive=true');
  expect(host.events[0]?.detail.type === 'open', 'dialog: open should dispatch onDialogOpen');
  ctrl.close();
  expect(host.isActive === false, 'dialog: close should set isActive=false');
  expect(host.events[1]?.detail.type === 'close', 'dialog: close should dispatch onDialogClose');
  ctrl.hostDisconnected();
}

function testMenu() {
  const mod = loadModule('menu');
  const host = new FakeHost();
  const items = [{ click: () => {}, focus: () => {}, textContent: 'Apple' }, { click: () => {}, focus: () => {}, textContent: 'Banana' }];
  host.querySelectorAll = () => items;
  const ctrl = new mod.MenuController(host);
  ctrl.hostConnected();
  ctrl.next();
  expect(host.activeIndex === 0, 'menu: next from -1 should land at 0');
  ctrl.next();
  expect(host.activeIndex === 1, 'menu: next should advance');
  ctrl.next();
  expect(host.activeIndex === 0, 'menu: next should wrap');
  ctrl.hostDisconnected();
}

function testTabs() {
  const mod = loadModule('tabs');
  const host = new FakeHost();
  const tabs = [{ focus: () => {} }, { focus: () => {} }, { focus: () => {} }];
  host.querySelectorAll = () => tabs;
  const ctrl = new mod.TabsController(host, { activation: 'automatic' });
  ctrl.hostConnected();
  ctrl.select(2);
  expect(host.selectedIndex === 2, 'tabs: select should set selectedIndex');
  expect(host.events.find((e) => e.type === 'onTabSelect'), 'tabs: select should dispatch onTabSelect');
  ctrl.focusNext();
  expect(host.selectedIndex === 0, 'tabs: focusNext wraps + auto-activates');
  ctrl.hostDisconnected();
}

function testTooltip() {
  const mod = loadModule('tooltip');
  const host = new FakeHost();
  // Use 0 delays so timers fire on the next microtask.
  const ctrl = new mod.TooltipController(host, { showDelayMs: 0, hideDelayMs: 0 });
  ctrl.hostConnected();
  ctrl.show();
  return new Promise((resolve) => {
    setTimeout(() => {
      expect(host.isVisible === true, 'tooltip: show after delay');
      ctrl.hide();
      setTimeout(() => {
        expect(host.isVisible === false, 'tooltip: hide after delay');
        ctrl.hostDisconnected();
        resolve();
      }, 20);
    }, 20);
  });
}

async function main() {
  testDialog();
  testMenu();
  testTabs();
  await testTooltip();
  console.log('[controllers] PASS — dialog, menu, tabs, tooltip state transitions verified.');
}

main();
