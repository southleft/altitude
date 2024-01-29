import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../button/button';
import '../icon/icons/list';
import '../list-item/list-item';
import '../list/list';
import './contextual-menu';

export default {
  title: 'Components/Contextual Menu',
  component: 'sl-contextual-menu',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onContextualMenuOpen', 'onContextualMenuClose']
    }
  },
  decorators: [withActions],
};

const Template = (args) => html`
  <sl-contextual-menu ${spread(args)}>
    <sl-button slot="trigger" ?hideText=${true}>
      Menu<sl-icon-list slot="after"></sl-icon-list>
    </sl-button>
    <sl-list>
      <sl-list-item>List Item 1</sl-list-item>
      <sl-list-item>List Item 2</sl-list-item>
      <sl-list-item>List Item 3</sl-list-item>
      <sl-list-item>List Item 4</sl-list-item>
      <sl-list-item>List Item 5</sl-list-item>
      <sl-list-item>List Item 6</sl-list-item>
    </sl-list>
  </sl-contextual-menu>
`;

export const Default = Template.bind({});
Default.args = {};

export const PositionBottomCenter = Template.bind({});
PositionBottomCenter.args = {
  position: 'bottom-center'
};

export const PositionBottomRight = Template.bind({});
PositionBottomRight.args = {
  position: 'bottom-right'
};

export const PositionTop = Template.bind({});
PositionTop.args = {
  position: 'top'
};

export const PositionTopCenter = Template.bind({});
PositionTopCenter.args = {
  position: 'top-center'
};

export const PositionTopRight = Template.bind({});
PositionTopRight.args = {
  position: 'top-right'
};

export const PositionLeft = Template.bind({});
PositionLeft.args = {
  position: 'left'
};

export const PositionRight = Template.bind({});
PositionRight.args = {
  position: 'right'
};