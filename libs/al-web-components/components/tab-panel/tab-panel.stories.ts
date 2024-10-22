import { html } from 'lit';
import { spread } from '../../directives/spread';
import './tab-panel';
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
  <al-text-passage>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean nec nulla nunc. Mauris id augue ut nulla egestas tempor non a lectus. In id dignissim metus, eu luctus velit. Pellentesque rhoncus enim et feugiat fringilla. Praesent congue nisl dui, non convallis velit ultrices ac. Vestibulum vulputate enim turpis, id auctor mi vulputate vitae.</p>
    <p>Mauris tristique metus sed enim faucibus, eget cursus elit pretium. In pellentesque interdum tellus sit amet varius. Sed at tempus dolor. Phasellus egestas, tellus eu gravida tincidunt, urna ante lacinia ex, nec sodales leo lorem in est. Donec sollicitudin massa magna, vitae sagittis massa auctor convallis.</p>
  </al-text-passage>
  <al-button>Button</al-button>
</al-tab-panel>
`;

export const Default = Template.bind({});
Default.args = {};