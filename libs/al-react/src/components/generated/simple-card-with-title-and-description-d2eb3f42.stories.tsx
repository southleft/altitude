import type { Meta, StoryObj } from '@storybook/react';
import { ALLayout, ALLayoutSection, ALCard, ALHeading, ALTextPassage } from 'al-react/src';

export default {
  title: 'Story UI Pages/Simple Card with Title and Description',
  component: ALLayout,
  subcomponents: { ALLayoutSection, ALCard, ALHeading, ALTextPassage },
} as Meta<typeof ALLayout>;

export const Default: StoryObj<typeof ALLayout> = {
  args: {
    children: (
      <ALLayout>
        <ALLayoutSection>
          <ALCard>
            <ALHeading slot="header" variant="lg">Card Title</ALHeading>
            <ALTextPassage>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus accumsan 
              quam at eros malesuada, in dignissim velit dignissim. Praesent euismod nulla 
              vel urna ullamcorper, id dapibus dolor tincidunt. Sed eget purus nec nisl 
              luctus consequat sit amet et turpis.
            </ALTextPassage>
          </ALCard>
        </ALLayoutSection>
      </ALLayout>
    )
  }
};