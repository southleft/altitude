import { html } from 'lit';
import { spread } from '../../directives/spread';
import './loading-indicator';

export default {
  title: 'Components/Loading Indicator',
  component: 'sl-loading-indicator',
  tags: [ 'autodocs' ],
  parameters: { status: { type: 'stable' } }
};

export const Default = (args) => html` <sl-loading-indicator ${spread(args)}></sl-loading-indicator> `;

export const Small = () => html` <sl-loading-indicator ?small="${true}"></sl-loading-indicator> `;

export const Inverted = () => html`<sl-loading-indicator ?inverted="${true}"></sl-loading-indicator>`;
Inverted.parameters = {
  backgrounds: { default: 'dark' }
};