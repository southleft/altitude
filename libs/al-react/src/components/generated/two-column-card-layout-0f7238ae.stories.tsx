import type { StoryObj } from '@storybook/react-webpack5';
import { ALLayout, ALLayoutContainer, ALLayoutSection, ALCard, ALHeading, ALTextPassage } from 'al-react/src';

export default {
  title: 'Story UI Pages/Two-Column Card Layout',
  component: ALLayout,
  subcomponents: { ALLayoutContainer, ALLayoutSection, ALCard, ALHeading, ALTextPassage },
};

export const TwoColumnCards: StoryObj<typeof ALLayout> = {
  args: {
    variant: 'two-column',
    children: (
      <ALLayoutContainer>
        <ALLayoutSection>
          <ALCard>
            <ALHeading level={3}>Card 1</ALHeading>
            <ALTextPassage>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus non velit vel tellus consectetur ultricies in quis massa.
            </ALTextPassage>
          </ALCard>
          <ALCard>
            <ALHeading level={3}>Card 2</ALHeading>
            <ALTextPassage>
              Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.
            </ALTextPassage>
          </ALCard>
        </ALLayoutSection>
        <ALLayoutSection>
          <ALCard>
            <ALHeading level={3}>Card 3</ALHeading>
            <ALTextPassage>
              Maecenas vel arcu scelerisque, hendrerit enim vitae, luctus odio. Cras finibus sollicitudin eros, sit amet sodales nulla aliquet vitae.
            </ALTextPassage>
          </ALCard>
          <ALCard>
            <ALHeading level={3}>Card 4</ALHeading>
            <ALTextPassage>
              Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Vivamus feugiat quam eu mauris finibus, eget malesuada elit imperdiet.
            </ALTextPassage>
          </ALCard>
        </ALLayoutSection>
      </ALLayoutContainer>
    )
  }
};