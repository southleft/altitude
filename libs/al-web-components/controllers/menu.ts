// T5.1 — Headless menu behavior controller.
//
// Handles keyboard navigation (arrow keys, Home/End, type-ahead),
// active-item tracking, and Enter/Space activation for any list-like menu
// host. Reusable by combobox, select, menu, tabs (with horizontal axis).

import type { ReactiveController, ReactiveControllerHost } from 'lit';

export interface MenuControllerOptions {
  /** `vertical` for menus, `horizontal` for tabs. */
  orientation?: 'vertical' | 'horizontal';
  /** Wrap from last to first item. Default true. */
  wrap?: boolean;
  /** CSS selector for items inside the host. Default `[role="menuitem"]`. */
  itemSelector?: string;
}

export interface MenuControllerHost extends ReactiveControllerHost, HTMLElement {
  activeIndex?: number;
}

export class MenuController implements ReactiveController {
  private host: MenuControllerHost;
  private opts: Required<MenuControllerOptions>;
  private _typeAheadBuffer = '';
  private _typeAheadTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(host: MenuControllerHost, opts: MenuControllerOptions = {}) {
    this.host = host;
    this.opts = {
      orientation: opts.orientation ?? 'vertical',
      wrap: opts.wrap ?? true,
      itemSelector: opts.itemSelector ?? '[role="menuitem"]',
    };
    this._onKeyDown = this._onKeyDown.bind(this);
    host.addController(this);
  }

  hostConnected() {
    this.host.addEventListener('keydown', this._onKeyDown);
  }
  hostDisconnected() {
    this.host.removeEventListener('keydown', this._onKeyDown);
  }

  items(): HTMLElement[] {
    return Array.from(this.host.querySelectorAll(this.opts.itemSelector));
  }

  next() {
    const items = this.items();
    if (!items.length) return;
    const i = (this.host.activeIndex ?? -1) + 1;
    this.activate(this.opts.wrap ? i % items.length : Math.min(i, items.length - 1));
  }
  prev() {
    const items = this.items();
    if (!items.length) return;
    const i = (this.host.activeIndex ?? items.length) - 1;
    this.activate(this.opts.wrap && i < 0 ? items.length - 1 : Math.max(i, 0));
  }
  first() { this.activate(0); }
  last() { this.activate(this.items().length - 1); }

  activate(index: number) {
    this.host.activeIndex = index;
    const item = this.items()[index];
    item?.focus?.();
    this.host.requestUpdate?.();
  }

  private _onKeyDown(e: KeyboardEvent) {
    const nextKey = this.opts.orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
    const prevKey = this.opts.orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
    if (e.key === nextKey) { e.preventDefault(); this.next(); return; }
    if (e.key === prevKey) { e.preventDefault(); this.prev(); return; }
    if (e.key === 'Home') { e.preventDefault(); this.first(); return; }
    if (e.key === 'End')  { e.preventDefault(); this.last(); return; }
    if (e.key === 'Enter' || e.key === ' ') {
      const item = this.items()[this.host.activeIndex ?? -1];
      if (item) { e.preventDefault(); item.click?.(); }
      return;
    }
    // Type-ahead: alphanumeric keys filter to first matching item.
    if (e.key.length === 1 && /[\w]/.test(e.key)) {
      this._typeAheadBuffer += e.key.toLowerCase();
      if (this._typeAheadTimer) clearTimeout(this._typeAheadTimer);
      this._typeAheadTimer = setTimeout(() => (this._typeAheadBuffer = ''), 500);
      const items = this.items();
      const idx = items.findIndex((el) =>
        (el.textContent || '').trim().toLowerCase().startsWith(this._typeAheadBuffer)
      );
      if (idx >= 0) this.activate(idx);
    }
  }
}
