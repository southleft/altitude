import { html } from 'lit';
import './button';

export default {
  tags: ['autodocs'],
  title: 'Atoms/Button',
  component: 'sl-button',
  parameters: { status: { type: 'beta' } },
};

export const Default = () =>
  html`<sl-button variant="primary">Button</sl-button>`;

export const Secondary = () =>
  html`<sl-button variant="secondary">Secondary Button</sl-button>`;
