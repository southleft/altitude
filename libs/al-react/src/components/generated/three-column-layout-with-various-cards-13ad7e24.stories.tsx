import type { Meta, StoryObj } from '@storybook/react';
import { ALLayout, ALLayoutSection, ALCard, ALHeading, ALTextPassage, ALList, ALListItem, ALButtonGroup, ALButton } from 'al-react/src';

export default {
  title: 'Story UI Pages/Three-Column Layout with Various Cards',
  component: ALLayout,
  subcomponents: { ALLayoutSection, ALCard, ALList, ALListItem, ALButtonGroup, ALButton },
} as Meta<typeof ALLayout>;

export const Default: StoryObj<typeof ALLayout> = {
  args: {
    children: (
      <ALLayout>
        <ALLayoutSection>
          <ALCard>
            <ALHeading slot="header" variant="md">Basic Card</ALHeading>
            <ALTextPassage>This is a basic card with just a heading and some text content.</ALTextPassage>
            <ALButtonGroup slot="footer">
              <ALButton>Action</ALButton>
            </ALButtonGroup>
          </ALCard>
        </ALLayoutSection>
        <ALLayoutSection>
          <ALCard>
            <ALHeading slot="header" variant="md">List Card</ALHeading>
            <ALList>
              <ALListItem>List item 1</ALListItem>
              <ALListItem>List item 2</ALListItem>
              <ALListItem>List item 3</ALListItem>
            </ALList>
          </ALCard>
        </ALLayoutSection>
        <ALLayoutSection>
          <ALCard>
            <ALHeading slot="header" variant="md">Multiple Section Card</ALHeading>
            <ALTextPassage>This card has multiple sections.</ALTextPassage>
            <ALList>
              <ALListItem>Section 1</ALListItem>
              <ALListItem>Section 2</ALListItem>
            </ALList>
            <ALButtonGroup slot="footer">
              <ALButton>Action 1</ALButton>
              <ALButton>Action 2</ALButton>
            </ALButtonGroup>
          </ALCard>
        </ALLayoutSection>
      </ALLayout>
    )
  }
};