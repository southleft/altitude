import type { Meta, StoryObj } from '@storybook/react';
import { ALLayout, ALLayoutSection, ALCard, ALHeading, ALTextPassage } from 'al-react/src';

export default {
  title: 'Story UI Pages/Dashboard with Analytics Cards',
  component: ALLayout,
  subcomponents: { ALLayoutSection, ALCard },
} as Meta<typeof ALLayout>;

export const Default: StoryObj<typeof ALLayout> = {
  args: {
    children: (
      <ALLayout>
        <ALLayoutSection>
          <ALCard>
            <ALHeading slot="header" variant="md">Total Users</ALHeading>
            <ALTextPassage>532,490</ALTextPassage>
          </ALCard>
        </ALLayoutSection>
        <ALLayoutSection>
          <ALCard>
            <ALHeading slot="header" variant="md">Monthly Active Users</ALHeading>
            <ALTextPassage>124,583</ALTextPassage>
          </ALCard>
        </ALLayoutSection>
        <ALLayoutSection>
          <ALCard>
            <ALHeading slot="header" variant="md">Avg Session Duration</ALHeading>
            <ALTextPassage>9m 13s</ALTextPassage>
          </ALCard>
        </ALLayoutSection>
        <ALLayoutSection>
          <ALCard>
            <ALHeading slot="header" variant="md">Bounce Rate</ALHeading>
            <ALTextPassage>38.2%</ALTextPassage>
          </ALCard>
        </ALLayoutSection>
        <ALLayoutSection>
          <ALCard>
            <ALHeading slot="header" variant="md">Conversion Rate</ALHeading>
            <ALTextPassage>4.8%</ALTextPassage>
          </ALCard>
        </ALLayoutSection>
        <ALLayoutSection>
          <ALCard>
            <ALHeading slot="header" variant="md">Revenue</ALHeading>
            <ALTextPassage>$524,391</ALTextPassage>
          </ALCard>
        </ALLayoutSection>
      </ALLayout>
    )
  }
};