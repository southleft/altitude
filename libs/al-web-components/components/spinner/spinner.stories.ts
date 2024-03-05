import { html } from 'lit';
import { spread } from '../../directives/spread';
import './spinner';

export default {
  title: 'Atoms/Spinner',
  component: 'al-spinner',
  tags: [ 'autodocs' ],
  parameters: { status: { type: 'beta' } }
};

export const Default = (args) => html` <al-spinner ${spread(args)}></al-spinner> `;

export const Small = () => html` <al-spinner ?small="${true}"></al-spinner> `;

export const Inverted = () => html`<al-spinner ?inverted="${true}"></al-spinner>`;
Inverted.parameters = {
  backgrounds: { default: 'dark' }
};