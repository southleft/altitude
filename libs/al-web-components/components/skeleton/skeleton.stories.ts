import { html } from 'lit';
import { spread } from '../../directives/spread';
import './skeleton';

export default {
  title: 'Atoms/Skeleton',
  component: 'al-skeleton',
  // HIDDEN FROM THE SIDEBAR. `'!autodocs'` opts this meta out of the global
  // `tags: ['autodocs']` in `.storybook/preview.ts`, and with `docs.docsMode` on
  // in `main.ts` the individual stories are already hidden — so dropping the docs
  // entry removes the component from the sidebar entirely. The component itself
  // is untouched and still exported from `bundle.ts`.
  tags: [ '!autodocs' ],
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
  },
  args: {
    width: '200',
  }
};

const Template = (args) => html`<al-skeleton ${spread(args)} data-testid="skeleton">Hello world</al-skeleton>`;

export const Default = Template.bind({});
Default.args = {};

export const Circle = Template.bind({});
Circle.args = {
  variant: 'circle',
  width: '100',
  height: '100',
};

export const Square = Template.bind({});
Square.args = {
  variant: 'square'
};