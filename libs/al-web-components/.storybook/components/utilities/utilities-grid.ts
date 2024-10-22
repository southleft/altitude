import { html, LitElement, unsafeCSS } from 'lit';
import styles from './utilities.scss';
import spacingStyles from '../../../styles/core/utilities/spacing.scss';
import '../token-specimen/token-specimen';
import '../f-po/f-po';

const codeResonsiveColumns1 = String.raw`<div class="al-u-grid cols:6@md cols:3@lg al-u-gap-lg">
  <div>1</div>
  <div>2</div>
  <div>3</div>
  <div>4</div>
</div>`;

const codeResonsiveColumns2 = String.raw`<div class="al-u-grid al-u-gap-lg">
  <div class="al-u-grid__item col:6 col:8@md">1</div>
  <div class="al-u-grid__item col:6 col:4@md">2</div>
</div>`;

const codeImplicitColumns = String.raw`<div class="al-u-grid cols:6@md cols:4@lg cols:3@xl">
  <div>1</div>
  <div>2</div>
  <div>3</div>
  <div>4</div>
  <div>5</div>
  <div>6</div>
  <div>7</div>
  <div>8</div>
</div>`;

const codeExplicitColumns = String.raw`<div class="al-u-grid">
  <div class="al-u-grid__item col:8@md">1</div>
  <div class="al-u-grid__item col:4@md">2</div>
  <div class="al-u-grid__item col:8@md">3</div>
  <div class="al-u-grid__item col:4@md">4</div>
</div>`;

const codeExplicitRows = String.raw`<div class="al-u-grid">
  <div class="al-u-grid__item col:8@md">1</div>
  <div class="al-u-grid__item col:4@md row:2@md">2</div>
  <div class="al-u-grid__item col:4@md">3</div>
</div>`;

const codeOffsetColumns = String.raw`<div class="al-u-grid">
  <div class="al-u-grid__item col:7@md offset:2@md">1</div>
  <div class="al-u-grid__item col:3@md">2</div>
</div>`;

const codeFullGridLayout = String.raw`<div class="al-u-grid">
  <div class="al-u-grid__item col:1">1</div>
  <div class="al-u-grid__item col:1">1</div>
  <div class="al-u-grid__item col:1">1</div>
  <div class="al-u-grid__item col:1">1</div>
  <div class="al-u-grid__item col:1">1</div>
  <div class="al-u-grid__item col:1">1</div>
  <div class="al-u-grid__item col:1">1</div>
  <div class="al-u-grid__item col:1">1</div>
  <div class="al-u-grid__item col:1">1</div>
  <div class="al-u-grid__item col:1">1</div>
  <div class="al-u-grid__item col:1">1</div>
  <div class="al-u-grid__item col:1">1</div>
  <div class="al-u-grid__item col:2">2</div>
  <div class="al-u-grid__item col:2">2</div>
  <div class="al-u-grid__item col:2">2</div>
  <div class="al-u-grid__item col:2">2</div>
  <div class="al-u-grid__item col:2">2</div>
  <div class="al-u-grid__item col:2">2</div>
  <div class="al-u-grid__item col:3">3</div>
  <div class="al-u-grid__item col:3">3</div>
  <div class="al-u-grid__item col:3">3</div>
  <div class="al-u-grid__item col:3">3</div>
  <div class="al-u-grid__item col:4">4</div>
  <div class="al-u-grid__item col:4">4</div>
  <div class="al-u-grid__item col:4">4</div>
  <div class="al-u-grid__item col:6">6</div>
  <div class="al-u-grid__item col:6">6</div>
  <div class="al-u-grid__item col:12">12</div>
</div>`;

export class UtilitiesGrid extends LitElement {
  static get styles() {
    return unsafeCSS([styles.toString(), spacingStyles.toString()]);
  }

  render() {
    return html`
      <section>
        <header>
          <h1>Utilities: Grid</h1>
          <p>Grid utility classes provide a set of predefined styles for creating responsive grid layouts in web projects. These classes are designed to simplify the creation of grid-based designs and ensure consistency across different screen sizes.</p>
          <p>To adjust the grid gap, use the <a href="/?path=/story/fundamentals-utilities--spacing">spacing utitlity classes</a></p>
        </header>
        <hr />
        <table>
          <caption>
            <h2>Alignment Utility Classes</h2>
            <p>Alignment utility classes controls how items are aligned along the main axis of the grid container.</p>
          </caption>
          <thead>
            <tr>
              <th>Utility Class</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><token-code value="al-u-grid--align-center"></token-code></td>
              <td>Aligns items to the center of the cross axis.</td>
            </tr>
            <tr>
              <td><token-code value="al-u-grid--align-end"></token-code></td>
              <td>Aligns items to the end of the cross axis.</td>
            </tr>
            <tr>
              <td><token-code value="al-u-grid--align-stretch"></token-code></td>
              <td>Stretches items to fill the cross axis.</td>
            </tr>
            <tr>
              <td><token-code value="al-u-grid--justify-center"></token-code></td>
              <td>Aligns items to the center of the main axis.</td>
            </tr>
            <tr>
              <td><token-code value="al-u-grid--justify-end"></token-code></td>
              <td>Aligns items to the end of the main axis.</td>
            </tr>
            <tr>
              <td><token-code value="al-u-grid--justify-space-between"></token-code></td>
              <td>Aligns items with space between them along the main axis.</td>
            </tr>
          </tbody>
        </table>
        <hr />
        <div>
          <h2>Responsive Columns</h2>
          <p>Responsive column utilities are available. Column breakpoints can be stacked. Column breakpoints are adjustable using the Sass variables.</p>
        </div>
        <div class="al-u-grid cols:6@md cols:3@lg al-u-gap-lg">
          <f-po>1</f-po>
          <f-po>2</f-po>
          <f-po>3</f-po>
          <f-po>4</f-po>
        </div>
        <pre><code>${codeResonsiveColumns1}</code></pre>
        <div class="al-u-grid al-u-gap-lg">
          <f-po class="al-u-grid__item col:6 col:8@md">1</f-po>
          <f-po class="al-u-grid__item col:6 col:4@md">2</f-po>
        </div>
        <pre><code>${codeResonsiveColumns2}</code></pre>
        <hr />
        <div>
          <h2>Implicit Columns</h2>
          <p>Implicit uniform columns can define their values at the parent grid element. Unlike traditional Flexbox or float grid libraries there is no need for wrapper elements around each column.</p>
        </div>
        <div class="al-u-grid cols:6@md cols:4@lg cols:3@xl">
          <f-po>1</f-po>
          <f-po>2</f-po>
          <f-po>3</f-po>
          <f-po>4</f-po>
          <f-po>5</f-po>
          <f-po>6</f-po>
          <f-po>7</f-po>
          <f-po>8</f-po>
        </div>
        <pre><code>${codeImplicitColumns}</code></pre>
        <hr />
        <div>
          <h2>Explicit Columns</h2>
          <p>Columns that are not uniform can define their column span value directly on the column element. Column properties can be placed directly on the element with no need for wrapper elements.</p>
        </div>
        <div class="al-u-grid">
          <f-po class="al-u-grid__item col:8@md">1</f-po>
          <f-po class="al-u-grid__item col:4@md">2</f-po>
          <f-po class="al-u-grid__item col:8@md">3</f-po>
          <f-po class="al-u-grid__item col:4@md">4</f-po>
        </div>
        <pre><code>${codeExplicitColumns}</code></pre>
        <hr />
        <div>
          <h2>Explicit Rows</h2>
          <p>Rows that are not uniform can define their row span value directly on the row element. Row properties can be placed directly on the element with no need for wrapper elements.</p>
        </div>
        <div class="al-u-grid">
          <f-po class="al-u-grid__item col:8@md">1</f-po>
          <f-po class="al-u-grid__item col:4@md row:2@md">2</f-po>
          <f-po class="al-u-grid__item col:8@md">3</f-po>
        </div>
        <pre><code>${codeExplicitRows}</code></pre>
        <hr />
        <div>
          <h2>Offset Columns</h2>
          <p></p>
        </div>
        <div class="al-u-grid">
          <f-po class="al-u-grid__item col:7@md offset:2@md">1</f-po>
          <f-po class="al-u-grid__item col:3@md">2</f-po>
        </div>
        <pre><code>${codeOffsetColumns}</code></pre>
        <hr />
        <div>
          <h2>Full Grid Layout</h2>
          <p>Most class based grids require a row wrapper element for every given row. This is not needed with this grid. Multiple rows are achieved with filling columns according to the 12 column layout. Example showing all 12 column options:</p>
        </div>
        <div class="al-u-grid">
          <f-po class="al-u-grid__item col:1">1</f-po>
          <f-po class="al-u-grid__item col:1">1</f-po>
          <f-po class="al-u-grid__item col:1">1</f-po>
          <f-po class="al-u-grid__item col:1">1</f-po>
          <f-po class="al-u-grid__item col:1">1</f-po>
          <f-po class="al-u-grid__item col:1">1</f-po>
          <f-po class="al-u-grid__item col:1">1</f-po>
          <f-po class="al-u-grid__item col:1">1</f-po>
          <f-po class="al-u-grid__item col:1">1</f-po>
          <f-po class="al-u-grid__item col:1">1</f-po>
          <f-po class="al-u-grid__item col:1">1</f-po>
          <f-po class="al-u-grid__item col:1">1</f-po>
          <f-po class="al-u-grid__item col:2">2</f-po>
          <f-po class="al-u-grid__item col:2">2</f-po>
          <f-po class="al-u-grid__item col:2">2</f-po>
          <f-po class="al-u-grid__item col:2">2</f-po>
          <f-po class="al-u-grid__item col:2">2</f-po>
          <f-po class="al-u-grid__item col:2">2</f-po>
          <f-po class="al-u-grid__item col:3">3</f-po>
          <f-po class="al-u-grid__item col:3">3</f-po>
          <f-po class="al-u-grid__item col:3">3</f-po>
          <f-po class="al-u-grid__item col:3">3</f-po>
          <f-po class="al-u-grid__item col:4">4</f-po>
          <f-po class="al-u-grid__item col:4">4</f-po>
          <f-po class="al-u-grid__item col:4">4</f-po>
          <f-po class="al-u-grid__item col:6">6</f-po>
          <f-po class="al-u-grid__item col:6">6</f-po>
          <f-po class="al-u-grid__item col:12">12</f-po>
        </div>
        <pre><code>${codeFullGridLayout}</code></pre>
      </section>
    `;
  }
}

if (customElements.get('utilities-grid') === undefined) {
  customElements.define('utilities-grid', UtilitiesGrid);
}

declare global {
  interface HTMLElementTagNameMap {
    'utilities-grid': UtilitiesGrid;
  }
}
