import type { StoryObj } from '@storybook/react-webpack5';
import { Card } from 'your-component-library';

export default {
  title: 'Generated/Simple Card with Title and Description',
  component: Card,
};

export const Default: StoryObj<typeof Card> = {
  args: {
    children: (
      <div>
        <div>
          <Card>
            <h3>Sample Card Title</h3>
            <p>This is a sample card with a title and description. It demonstrates the basic usage of the Card component from the component library.</p>
          </Card>
        </div>
      </div>
    )
  }
};