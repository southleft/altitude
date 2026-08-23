import { html } from 'lit';
import { spread } from '../../directives/spread';
import './tab-panel';
import { loremParagraphs } from '../../.storybook/fixtures';
import '../button/button';

export default {
  title: 'Atoms/Tab Panel',
  component: 'al-tab-panel',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    controls: {
      exclude: ['ariaLabelledBy', 'idx', 'ariaId', 'tabPanelEl']
    },
  },
  argTypes: {
    isActive: {
      control: 'boolean',
    },
  },
  args: {
    isActive: true,
  }
};

const Template = (args) => html`
<al-tab-panel ${spread(args)} data-testid="tab-panel">
  <al-text-block>
    ${loremParagraphs(2, 'tab-panel').map((p) => html`<p>${p}</p>`)}
  </al-text-block>
  <al-button>Button</al-button>
</al-tab-panel>
`;

export const Default = Template.bind({});
Default.args = {};