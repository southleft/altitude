import { html } from 'lit';
import { spread } from '../../directives/spread';
import './toggle-button-group';
import '../layout/layout';
import '../toggle-button/toggle-button';
import '../icon/icons/emoji';
import '../../fixtures/f-po/f-po';

export default {
  title: 'Molecules/Form/Toggle Button Group',
  component: 'al-toggle-button-group',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onToggleButtonSelect', 'onToggleButtonDeselect']
    },
    controls: {
      exclude: ['selectedItem', 'toggleButtons']
    }
  },
  argTypes: {
    variant: {
      control: 'radio',
      options: ['default', 'background']
    },
  }
};

const Template = (args) => html`
  <al-toggle-button-group ${spread(args)} data-testid="toggle-button-group">
    <al-toggle-button data-testid="toggle-button-01">
      <al-icon-emoji size="lg"></al-icon-emoji>
    </al-toggle-button>
    <al-toggle-button data-testid="toggle-button-02">
      <al-icon-emoji size="lg"></al-icon-emoji>
    </al-toggle-button>
    <al-toggle-button data-testid="toggle-button-03">
      <al-icon-emoji size="lg"></al-icon-emoji>
    </al-toggle-button>
  </al-toggle-button-group>
`;

export const Default = Template.bind({});
Default.args = {};

export const Background = Template.bind({});
Background.args = {
  variant: 'background'
};

/**
 * Arrangement belongs to `<al-layout>`. Nest the toggle buttons in an
 * `<al-layout>` and set the direction there; the group owns only its
 * single-select behaviour and pill chrome.
 */
const VerticalTemplate = (args) => html`
  <al-toggle-button-group ${spread(args)} data-testid="toggle-button-group">
    <al-layout gap="none">
      <al-toggle-button data-testid="toggle-button-01">
        <al-icon-emoji size="lg"></al-icon-emoji>
      </al-toggle-button>
      <al-toggle-button data-testid="toggle-button-02">
        <al-icon-emoji size="lg"></al-icon-emoji>
      </al-toggle-button>
      <al-toggle-button data-testid="toggle-button-03">
        <al-icon-emoji size="lg"></al-icon-emoji>
      </al-toggle-button>
    </al-layout>
  </al-toggle-button-group>
`;

export const Vertical = VerticalTemplate.bind({});
Vertical.args = {};

export const VerticalBackground = VerticalTemplate.bind({});
VerticalBackground.args = {
  variant: 'background'
};

const TemplateGapSmall = (args) => html`
  <div style="position: fixed; inset-block-end: 1rem; inset-inline-end: 1rem;">
    <al-toggle-button-group ${spread(args)}>
      <al-layout gap="md">
      <al-toggle-button variant="background">
        <al-popover position="top-left">
          <al-icon-emoji slot="trigger" size="lg"></al-icon-emoji>
          <f-po>Content</f-po>
        </al-popover>
      </al-toggle-button>
      <al-toggle-button variant="background">
        <al-popover position="top-left">
          <al-icon-emoji slot="trigger" size="lg"></al-icon-emoji>
          <f-po>Content</f-po>
        </al-popover>
      </al-toggle-button>
      <al-toggle-button variant="background">
        <al-popover position="top-left">
          <al-icon-emoji slot="trigger" size="lg"></al-icon-emoji>
          <f-po>Content</f-po>
        </al-popover>
      </al-toggle-button>
      </al-layout>
    </al-toggle-button-group>
  </div>
`;
export const GapSmall = TemplateGapSmall.bind({});
GapSmall.args = {};
GapSmall.parameters = {
  layout: 'fullscreen'
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

