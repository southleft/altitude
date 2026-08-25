import { html } from 'lit';
import { spread } from '../../directives/spread';
import './tooltip';
import { loremSentences } from '../../fixtures';

export default {
  title: 'Atoms/Tooltip',
  component: 'al-tooltip',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onTooltipOpen', 'onTooltipClose']
    },
    controls: {
      exclude: ['ariaDescribedBy']
    },
  },
  argTypes: {
    hasArrow: {
      type: 'boolean'
    },
    position: {
      options: ['top', 'bottom', 'left', 'right'],
      control: { type: 'radio' }
    },
    isActive: {
      type: 'boolean'
    },
    isDynamic: {
      type: 'boolean'
    },
    isInteractive: {
      type: 'boolean'
    },
  },
};

const Template = (args) => html`
  <al-tooltip ${spread(args)} data-testid="tooltip">
    <span slot="trigger">Hover me</span>
    <span slot="prefix">⌘ + C</span>
    Tooltip Text
  </al-tooltip>
`;

export const Default = Template.bind({});
Default.args = {};

export const PositionBottom = Template.bind({});
PositionBottom.args = {
  position: 'bottom'
};

export const PositionLeft = Template.bind({});
PositionLeft.args = {
  position: 'left'
};

export const PositionRight = Template.bind({});
PositionRight.args = {
  position: 'right'
};

const TemplatePositionDynamic = (args) => html`
  <div style="padding: 1rem; height: 100vh; width: 100%; display: flex; flex-direction: column; gap: 1rem; justify-content: space-between;">
    <div style="display: flex; justify-content: center;">
      <al-tooltip ${spread(args)} position="top" data-testid="tooltip-01">
        <span slot="trigger">Hover me</span>
        <span slot="prefix">Text</span>
        Tooltip Text
      </al-tooltip>
    </div>
    <div style="display: flex; justify-content: space-between;">
      <al-tooltip ${spread(args)} position="left" data-testid="tooltip-02">
        <span slot="trigger">Hover me</span>
        <span slot="prefix">Text</span>
        Tooltip Text
      </al-tooltip>
      <al-tooltip ${spread(args)} position="right" data-testid="tooltip-03">
        <span slot="trigger">Hover me</span>
        <span slot="prefix">Text</span>
        Tooltip Text
      </al-tooltip>
    </div>
    <div style="display: flex; justify-content: center;">
      <al-tooltip ${spread(args)} position="bottom" data-testid="tooltip-04">
        <span slot="trigger">Hover me</span>
        <span slot="prefix">Text</span>
        Tooltip Text
      </al-tooltip>
    </div>
  </div>
`;

export const PositionDynamic = TemplatePositionDynamic.bind({});
PositionDynamic.args = {
  isDynamic: true,
  heading: 'Tooltip heading',
};
PositionDynamic.parameters = {
  layout: 'fullscreen'
}

export const HideArrow = Template.bind({});
HideArrow.args = {
  hasArrow: false
};

const TemplateVisibleOnClick = (args) => html`
  <al-tooltip ${spread(args)} data-testid="tooltip">
    <span slot="trigger">Click me</span>
    <span slot="prefix">⌘ + C</span>
    Tooltip text
  </al-tooltip>
`;
export const VisibleOnClick = TemplateVisibleOnClick.bind({});
VisibleOnClick.args = {
  isInteractive: true,
};

const TemplateWithLongText = (args) => html`
  <al-tooltip ${spread(args)} data-testid="tooltip">
    <span slot="trigger">Hover me</span>
    <span slot="prefix">⌘ + C</span>
    ${loremSentences(2, 'tooltip')}
  </al-tooltip>
`;
export const WithLongText = TemplateWithLongText.bind({});
WithLongText.args = {};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/
