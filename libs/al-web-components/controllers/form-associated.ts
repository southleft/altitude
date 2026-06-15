// T5.3 — Form-associated controller via ElementInternals.
//
// Hosts that consume this controller become true form-associated custom
// elements: they appear in the owning form's `FormData`, participate in
// validity, and surface state to the constraint validation API.
//
// Pattern:
//   1. Component class sets `static formAssociated = true`.
//   2. Component instantiates `new FormAssociatedController(this)` in its
//      constructor.
//   3. On value change, call `controller.setValue(value)`.
//   4. On validation, call `controller.setValidity(flags, message?, anchor?)`.

import type { ReactiveController, ReactiveControllerHost } from 'lit';

export interface FormAssociatedHost extends ReactiveControllerHost, HTMLElement {
  name?: string;
}

export class FormAssociatedController implements ReactiveController {
  private internals: ElementInternals | null = null;

  constructor(host: FormAssociatedHost) {
    if (typeof host.attachInternals === 'function') {
      try {
        this.internals = host.attachInternals();
      } catch (err) {
        this.internals = null;
      }
    }
    host.addController(this);
  }

  hostConnected() {}
  hostDisconnected() {}

  /** Returns the owning `<form>` element or null. */
  get form(): HTMLFormElement | null {
    return this.internals?.form ?? null;
  }

  /** Submits the form, if any. */
  submit() {
    this.form?.requestSubmit();
  }

  /** Resets the form, if any. */
  reset() {
    this.form?.reset();
  }

  /** Make `value` carry into FormData under the host's name. */
  setValue(value: FormDataEntryValue | null) {
    if (!this.internals) return;
    this.internals.setFormValue(value);
  }

  /**
   * Mirror constraint validity to the host.
   *   - flags: per the ValidityState constructor — { valueMissing: true } etc.
   *   - message: error string to display via reportValidity()
   *   - anchor: focusable element to anchor the validation message.
   */
  setValidity(flags: ValidityStateFlags = {}, message?: string, anchor?: HTMLElement) {
    if (!this.internals) return;
    if (anchor) this.internals.setValidity(flags, message, anchor);
    else if (message) this.internals.setValidity(flags, message);
    else this.internals.setValidity(flags);
  }

  /** Returns the current ValidityState (when supported). */
  get validity(): ValidityState | null {
    return this.internals?.validity ?? null;
  }
}
