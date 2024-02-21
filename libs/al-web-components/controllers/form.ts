import { LitElement, ReactiveController, ReactiveControllerHost } from 'lit';

export class FormController implements ReactiveController {
  private host: ReactiveControllerHost;
  private form: HTMLFormElement;
  constructor(host: ReactiveControllerHost) {
    (this.host = host).addController(this);
  }

  hostUpdate(): void {
    const host = this.host as LitElement;
    const formId = host.getAttribute('form');
    this.form = (formId ? document.getElementById(formId) : host.closest('form')) as HTMLFormElement;
  }

  submit(type: 'reset' | 'submit'): void {
    if (this.form) {
      switch (type) {
        case 'reset':
          this.form.reset();
          break;
        case 'submit':
          this.form.requestSubmit();
          break;
      }
    }
  }
}
