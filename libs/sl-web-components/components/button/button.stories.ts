import { html } from 'lit';

export default {
  tags: ['autodocs'],
  title: 'Atoms/Button',
  component: 'c-button',
  parameters: { status: { type: 'beta' } },
};

export const Default = () =>
  html`<c-button variant="primary">Button</c-button>`;

export const Secondary = () =>
  html`<c-button variant="secondary">Secondary Button</c-button>`;
