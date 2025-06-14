import type { StoryObj } from '@storybook/react-webpack5';
import { Card } from 'your-component-library';

export default {
  title: 'Generated/Card with Title and Description',
  component: Card,
};

export const Default: StoryObj<typeof Card> = {
  args: {
    children: (
      <div>
        <div>
          <Card>
            <h3>Simple Card</h3>
            <p>This is a simple card component with a title and description. It can be used to display brief information or summaries.</p>
          </Card>
        </div>
      </div>
    )
  }
};