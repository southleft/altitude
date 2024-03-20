import { LitElement, html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import styles from './resource-hub.scss';
import '../../../components/button/button';
import '../../../components/card/card';
import '../../../components/divider/divider';
import '../../../components/header/header';
import '../../../components/heading/heading';
import '../../../components/icon/icons/document';
import '../../../components/layout-container/layout-container';
import '../../../components/layout/layout';
import '../../../components/logo/logo';
import '../../../components/tab-panel/tab-panel';
import '../../../components/tab/tab';
import '../../../components/tabs/tabs';
import '../../../components/text-passage/text-passage';


/**
 * Page: al-l-resource-hub
 */
export class ALResourceHub extends LitElement {
  static get styles() {
    return unsafeCSS(styles.toString());
  }

  @property()
  accessor styleModifier: string;

  render() {
    const componentClassNames = classMap({
      'al-l-resource-hub': true,
      [this.styleModifier]: !!this.styleModifier
    });

    return html`
      <al-layout class=${componentClassNames} gap="lg">
        <al-header>
          <al-layout-container styleModifier="al-u-gap-lg">
            <al-logo>By Southleft</al-logo>
          </al-layout-container>
        </al-header>
        <al-layout-container styleModifier="al-u-gap-lg">
          <div class="al-u-gap-xs al-u-flex-direction-row">
            <al-icon-document size="xxl"></al-icon-document>
            <al-heading variant="lg" tagName="h1" isBold="true">Resource Hub</al-heading>
          </div>
          <al-divider></al-divider>
          <al-layout-section styleModifier="al-u-gap">
            <div class="al-u-grid cols:12@sm cols:6@md cols:4@lg">
              <al-card>
                <al-heading variant="sm" tagName="h3" isBold="true">
                  <a href="https://zeroheight.com/809ab055e" target="_blank">ZeroHeight</a>
                </al-heading>
                <al-text-passage>All the documenation for best practices, implementation, usage guidelines and more.</al-text-passage>
                <al-button href="https://zeroheight.com/809ab055e" target="_blank">View</al-button>
              </al-card>
              <al-card>
                <al-heading variant="sm" tagName="h3" isBold="true">
                  <a href="https://www.figma.com/file/y83n4o9LOGs74oAoguFcGS/Altitude-Design-System?type=design&node-id=11684%3A83797&mode=design&t=dKiaHNT3K97X2KBv-1" target="_blank">Figma</a>
                </al-heading>
                <al-text-passage>The design file for the Altitude design system and source for all tokens.</al-text-passage>
                <al-button href="https://www.figma.com/file/y83n4o9LOGs74oAoguFcGS/Altitude-Design-System?type=design&node-id=11684%3A83797&mode=design&t=dKiaHNT3K97X2KBv-1" target="_blank">View</al-button>
              </al-card>
              <al-card>
                <al-heading variant="sm" tagName="h3" isBold="true">
                  <a href="https://github.com/southleft/altitude/" target="_blank">Git Repository</a>
                </al-heading>
                <al-text-passage>The repository that contains the entire codebase for the design system, Storybook, and web applications.</al-text-passage>
                <al-button href="https://github.com/southleft/altitude/" target="_blank">View</al-button>
              </al-card>
            </div>
          </al-layout-section>
          <al-layout-section styleModifier="al-u-gap">
            <al-heading variant="md" tagName="h2" isBold="true">Demos</al-heading>
            <al-tabs>
              <al-tab>Storybook</al-tab>
              <al-tab>Web Applications</al-tab>
              <al-tab-panel slot="panel">
                <div class="al-u-grid cols:12@sm cols:6@md cols:4@lg">
                  <al-card>
                    <al-heading variant="sm" tagName="h3" isBold="true">
                      <a href="/storybook/web-components" target="_blank">Web Components</a>
                    </al-heading>
                    <al-text-passage>Storybook component library using native web components.</al-text-passage>
                    <al-button href="/storybook/web-components" target="_blank">View</al-button>
                  </al-card>
                  <al-card>
                    <al-heading variant="sm" tagName="h3" isBold="true">
                      <a href="/storybook/react" target="_blank">React</a>
                    </al-heading>
                    <al-text-passage>Storybook component library using react wrappers of the native web components.</al-text-passage>
                    <al-button href="/storybook/react" target="_blank">View</al-button>
                  </al-card>
                </div>
              </al-tab-panel>
              <al-tab-panel slot="panel">
                <div class="al-u-grid cols:12@sm cols:6@md cols:4@lg">
                  <al-card>
                    <al-heading variant="sm" tagName="h3" isBold="true">
                      <a href="/angular/browser" target="_blank">Angular</a>
                    </al-heading>
                    <al-text-passage>Web application leveraging Angular framework with seamless integration of Web Components.</al-text-passage>
                    <al-button href="/angular/browser" target="_blank">View</al-button>
                  </al-card>
                  <al-card>
                    <al-heading variant="sm" tagName="h3" isBold="true">
                      <a href="/react" target="_blank">React</a>
                    </al-heading>
                    <al-text-passage>Web application leveraging React framework with seamless integration of Web Components.</al-text-passage>
                    <al-button href="/react" target="_blank">View</al-button>
                  </al-card>
                  <al-card>
                    <al-heading variant="sm" tagName="h3" isBold="true">
                      <a href="/svelte" target="_blank">Svelte</a>
                    </al-heading>
                    <al-text-passage>Web application leveraging Svelte framework with seamless integration of Web Components.</al-text-passage>
                    <al-button href="/svelte" target="_blank">View</al-button>
                  </al-card>
                </div>
              </al-tab-panel>
            </al-tabs>
          </al-layout-section>
        </al-layout-container>
      </al-layout>
    `;
  }
}

if (customElements.get('al-resource-hub') === undefined) {
  customElements.define('al-resource-hub', ALResourceHub);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-resource-hub': ALResourceHub;
  }
}
