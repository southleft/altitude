import type { StoryObj } from '@storybook/react-webpack5';
import { Card, Typography, CardContent } from 'your-component-library';

export default {
  title: 'Generated/Two-Column Material-UI Layout',
  component: Card,
};

export const Default: StoryObj<typeof Card> = {
  args: {
    children: (
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
        <div>
          <Card>
            <CardContent>
              <Typography variant="h5" component="div">
                Left Column
              </Typography>
              <Typography variant="body2">
                This is the content for the left column. It can contain text, images, or any other content.
              </Typography>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardContent>
              <Typography variant="h5" component="div">
                Right Column  
              </Typography>
              <Typography variant="body2">
                This is the content for the right column. It can also contain various types of content.
              </Typography>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
};