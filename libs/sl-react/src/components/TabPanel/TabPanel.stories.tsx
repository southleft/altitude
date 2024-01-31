import type { StoryObj } from '@storybook/react-webpack5';
import { SLTabPanel, SLTextPassage, SLButton } from '../..';

export default {
  title: 'Atoms/Tab Panel',
  component: SLTabPanel,
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
    children: (
      <>
        <SLTextPassage>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean nec nulla nunc. Mauris id augue ut nulla egestas tempor non a lectus. In id dignissim metus, eu luctus velit. Pellentesque rhoncus enim et feugiat fringilla. Praesent congue nisl dui, non convallis velit ultrices ac. Vestibulum vulputate enim turpis, id auctor mi vulputate vitae.</p>
          <p>Mauris tristique metus sed enim faucibus, eget cursus elit pretium. In pellentesque interdum tellus sit amet varius. Sed at tempus dolor. Phasellus egestas, tellus eu gravida tincidunt, urna ante lacinia ex, nec sodales leo lorem in est. Donec sollicitudin massa magna, vitae sagittis massa auctor convallis.</p>
        </SLTextPassage>
        <SLButton>Button</SLButton>
      </>
    ),
  },
};

export const Default: StoryObj<typeof SLTabPanel> = { args: {} };
