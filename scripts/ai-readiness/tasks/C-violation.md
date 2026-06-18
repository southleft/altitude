# Task C — Spot convention violations (attempt {{ATTEMPT}})

A junior developer submitted this PR for a new `<al-tag>` component. Identify every Altitude-convention violation. Return strict JSON matching the violation schema.

```ts
// libs/al-web-components/components/tag/tag.ts
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('al-tag')
export class AlTag extends LitElement {
  @property({ type: String })
  variant = 'default';

  @property({ type: Boolean })
  closeable = false;

  static styles = css`
    :host { display: inline-block; padding: 4px 8px; border-radius: 999px; }
    .tag { background: #5b8def; color: white; font-family: 'Helvetica Neue'; }
    .tag.danger { background: red; }
  `;

  handleClose() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  render() {
    return html`
      <div class="tag ${this.variant === 'danger' ? 'danger' : ''}">
        <slot></slot>
        ${this.closeable ? html`<button @click=${this.handleClose}>x</button>` : ''}
      </div>
    `;
  }
}
```

```scss
/* libs/al-web-components/components/tag/tag.scss */
:host { font-family: 'Helvetica Neue'; }
.tag {
  padding: 4px 8px;
}
```

Look for violations across: base class, decorator API, property style, event naming/dispatch, styles encapsulation, hardcoded values vs tokens, SCSS imports, cascade-layer use, missing JSDoc / story file / accessibility, naming, and event API. Use the docs as the source of truth.

For each violation, include `severity` (low/medium/high), the convention being referenced (`conventionRef`), and a concrete `fix`.
