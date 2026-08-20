import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../bento-grid/bento-grid';
import './bento-item';
import '../../.storybook/components/f-po/f-po';

export default {
  title: 'Organisms/Bento Item',
  component: 'al-bento-item',
  tags: ['autodocs'],
  parameters: {
    status: { type: 'beta' },
    layout: 'padded'
  },
  argTypes: {
    colSpan: { control: { type: 'number', min: 1, max: 12 } },
    rowSpan: { control: { type: 'number', min: 1, max: 4 } }
  },
  args: {
    colSpan: 6,
    rowSpan: 1
  }
};

export const Default = (args) => html`
  <al-bento-grid>
    <al-bento-item ${spread(args)}>
      <f-po style="height:100%;">Item</f-po>
    </al-bento-item>
    <al-bento-item colSpan="6">
      <f-po style="height:100%;">Item</f-po>
    </al-bento-item>
  </al-bento-grid>
`;
