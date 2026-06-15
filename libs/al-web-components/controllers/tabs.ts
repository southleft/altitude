// T5.1 — Headless tabs behavior controller.
//
// Selected-tab state + keyboard navigation (left/right + home/end), with
// optional manual or automatic activation following arrow keys.

import type { ReactiveController, ReactiveControllerHost } from 'lit';

export interface TabsControllerOptions {
  /** `automatic` — selection follows focus. `manual` — Enter/Space to commit. */
  activation?: 'automatic' | 'manual';
}

export interface TabsControllerHost extends ReactiveControllerHost, HTMLElement {
  selectedIndex?: number;
}

export class TabsController implements ReactiveController {
  private host: TabsControllerHost;
  private opts: Required<TabsControllerOptions>;
  private _focusIndex = 0;

  constructor(host: TabsControllerHost, opts: TabsControllerOptions = {}) {
    this.host = host;
    this.opts = { activation: opts.activation ?? 'automatic' };
    this._onKeyDown = this._onKeyDown.bind(this);
    host.addController(this);
  }

  hostConnected() {
    this.host.addEventListener('keydown', this._onKeyDown);
  }
  hostDisconnected() {
    this.host.removeEventListener('keydown', this._onKeyDown);
  }

  tabs(): HTMLElement[] {
    return Array.from(this.host.querySelectorAll('[role="tab"]'));
  }

  select(index: number) {
    const tabs = this.tabs();
    if (!tabs.length) return;
    const i = Math.max(0, Math.min(tabs.length - 1, index));
    this.host.selectedIndex = i;
    this._focusIndex = i;
    tabs[i]?.focus?.();
    this.host.requestUpdate?.();
    this.host.dispatchEvent(new CustomEvent('onTabSelect', { detail: { index: i }, bubbles: true, composed: true }));
  }

  focusNext() {
    const tabs = this.tabs();
    if (!tabs.length) return;
    this._focusIndex = (this._focusIndex + 1) % tabs.length;
    tabs[this._focusIndex]?.focus?.();
    if (this.opts.activation === 'automatic') this.select(this._focusIndex);
  }
  focusPrev() {
    const tabs = this.tabs();
    if (!tabs.length) return;
    this._focusIndex = (this._focusIndex - 1 + tabs.length) % tabs.length;
    tabs[this._focusIndex]?.focus?.();
    if (this.opts.activation === 'automatic') this.select(this._focusIndex);
  }

  private _onKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') { e.preventDefault(); this.focusNext(); return; }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); this.focusPrev(); return; }
    if (e.key === 'Home') { e.preventDefault(); this.select(0); return; }
    if (e.key === 'End')  { e.preventDefault(); this.select(this.tabs().length - 1); return; }
    if (e.key === 'Enter' || e.key === ' ') {
      if (this.opts.activation === 'manual') {
        e.preventDefault();
        this.select(this._focusIndex);
      }
    }
  }
}
