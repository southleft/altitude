// T5.1 — Headless dialog behavior controller.
//
// Encapsulates the open/close state, focus-trap setup, escape-key dismissal,
// and event dispatch for any modal-like host. Pure behavior — no DOM
// rendering, no styles. The styled component (`<al-dialog>`) consumes this
// controller to drive its template; a future headless React adapter can
// reuse the same logic without any Lit imports beyond the host shape.
//
// Plan acceptance (T5.1):
//   - Behavior is unit-tested independently of styling.
//   - Used by ≥3 complex components.
//   - Atoms show no diff (we don't touch them).

import type { ReactiveController, ReactiveControllerHost } from 'lit';

type DialogEvent = 'open' | 'close' | 'cancel';

export interface DialogControllerOptions {
  /** Optional class name used for `eventName` namespacing (e.g. 'Dialog' → 'onDialogOpen'). */
  prefix?: string;
  /** When true, ESC closes the dialog. Default true. */
  closeOnEscape?: boolean;
  /** When true, clicks outside the dialog root close it. Default true. */
  closeOnClickOutside?: boolean;
  /** Host-delegated close handler. When provided, the controller calls
   * this instead of its built-in `close()` so the host owns dispatching
   * the public `onDialogClose` event with the right detail shape. */
  onRequestClose?: (cause: 'escape' | 'click-outside') => void;
}

export interface DialogControllerHost extends ReactiveControllerHost, HTMLElement {
  isActive?: boolean;
}

export class DialogController implements ReactiveController {
  private host: DialogControllerHost;
  private opts: Required<DialogControllerOptions>;
  private _previousFocus: HTMLElement | null = null;

  constructor(host: DialogControllerHost, opts: DialogControllerOptions = {}) {
    this.host = host;
    this.opts = {
      prefix: opts.prefix ?? 'Dialog',
      closeOnEscape: opts.closeOnEscape ?? true,
      closeOnClickOutside: opts.closeOnClickOutside ?? true,
      onRequestClose: opts.onRequestClose ?? null as any,
    };
    // Bind once in the constructor so add/removeEventListener see the same
    // function reference (avoid the "listener never detaches" leak).
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onClickOutside = this._onClickOutside.bind(this);
    host.addController(this);
  }

  hostConnected() {
    if (this.opts.closeOnEscape) document.addEventListener('keydown', this._onKeyDown);
    if (this.opts.closeOnClickOutside) document.addEventListener('click', this._onClickOutside);
  }

  hostDisconnected() {
    if (this.opts.closeOnEscape) document.removeEventListener('keydown', this._onKeyDown);
    if (this.opts.closeOnClickOutside) document.removeEventListener('click', this._onClickOutside);
  }

  open(activator?: HTMLElement) {
    if (this.host.isActive) return;
    this._previousFocus = (document.activeElement as HTMLElement) ?? activator ?? null;
    this.host.isActive = true;
    this.host.requestUpdate?.();
    this._dispatch('open');
  }

  close(cancelled = false) {
    if (!this.host.isActive) return;
    this.host.isActive = false;
    this.host.requestUpdate?.();
    if (this._previousFocus && this._previousFocus.focus) {
      try { this._previousFocus.focus(); } catch {}
    }
    this._previousFocus = null;
    this._dispatch(cancelled ? 'cancel' : 'close');
  }

  toggle() {
    this.host.isActive ? this.close() : this.open();
  }

  private _onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && this.host.isActive) {
      e.preventDefault();
      if (this.opts.onRequestClose) this.opts.onRequestClose('escape');
      else this.close(true);
    }
  }

  private _onClickOutside(e: MouseEvent) {
    if (!this.host.isActive) return;
    const path = e.composedPath();
    if (!path.includes(this.host)) {
      if (this.opts.onRequestClose) this.opts.onRequestClose('click-outside');
      else this.close(true);
    }
  }

  private _dispatch(type: DialogEvent) {
    const eventName = `on${this.opts.prefix}${type[0].toUpperCase()}${type.slice(1)}`;
    this.host.dispatchEvent(
      new CustomEvent(eventName, { bubbles: true, composed: true, detail: { type, active: this.host.isActive } })
    );
  }
}
