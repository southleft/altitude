import { html } from 'lit';
import { spread } from '../../directives/spread';
import './spinner';

export default {
  title: 'Atoms/Spinner',
  component: 'sl-spinner',
  tags: [ 'autodocs' ],
  parameters: { status: { type: 'beta' } }
};

export const Default = (args) => html` <sl-spinner ${spread(args)}></sl-spinner> `;

export const Small = () => html` <sl-spinner ?small="${true}"></sl-spinner> `;

export const Inverted = () => html`<sl-spinner ?inverted="${true}"></sl-spinner>`;
Inverted.parameters = {
  backgrounds: { default: 'dark' }
};