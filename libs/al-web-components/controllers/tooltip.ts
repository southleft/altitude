// T5.1 — Headless tooltip behavior controller.
//
// Manages show/hide on hover + focus with debounced open/close delays.
// No positioning logic (that lives in popover); just visibility orchestration.

import type { ReactiveController, ReactiveControllerHost } from 'lit';

export interface TooltipControllerOptions {
  showDelayMs?: number;
  hideDelayMs?: number;
}
export interface TooltipControllerHost extends ReactiveControllerHost, HTMLElement {
  isVisible?: boolean;
}

export class TooltipController implements ReactiveController {
  private host: TooltipControllerHost;
  private opts: Required<TooltipControllerOptions>;
  private _showTimer: ReturnType<typeof setTimeout> | null = null;
  private _hideTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(host: TooltipControllerHost, opts: TooltipControllerOptions = {}) {
    this.host = host;
    this.opts = { showDelayMs: opts.showDelayMs ?? 200, hideDelayMs: opts.hideDelayMs ?? 150 };
    this._enter = this._enter.bind(this);
    this._leave = this._leave.bind(this);
    host.addController(this);
  }

  hostConnected() {
    this.host.addEventListener('mouseenter', this._enter);
    this.host.addEventListener('mouseleave', this._leave);
    this.host.addEventListener('focusin', this._enter);
    this.host.addEventListener('focusout', this._leave);
  }
  hostDisconnected() {
    this.host.removeEventListener('mouseenter', this._enter);
    this.host.removeEventListener('mouseleave', this._leave);
    this.host.removeEventListener('focusin', this._enter);
    this.host.removeEventListener('focusout', this._leave);
    if (this._showTimer) clearTimeout(this._showTimer);
    if (this._hideTimer) clearTimeout(this._hideTimer);
  }

  show() {
    if (this._hideTimer) { clearTimeout(this._hideTimer); this._hideTimer = null; }
    this._showTimer = setTimeout(() => {
      this.host.isVisible = true;
      this.host.requestUpdate?.();
    }, this.opts.showDelayMs);
  }
  hide() {
    if (this._showTimer) { clearTimeout(this._showTimer); this._showTimer = null; }
    this._hideTimer = setTimeout(() => {
      this.host.isVisible = false;
      this.host.requestUpdate?.();
    }, this.opts.hideDelayMs);
  }

  private _enter() { this.show(); }
  private _leave() { this.hide(); }
}
