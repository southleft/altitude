import type { StoryObj } from '@storybook/react-webpack5';
import { SLCard, SLHeading, SLButton, SLChip, SLIconDotsVertical, SLPopover, SLMenu, SLMenuItem, SLTextPassage } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Molecules/Card',
  component: SLCard,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
  },
  argTypes: {
    layout: {
      control: 'radio',
      options: ['default', 'row']
    },
    variant: {
      control: 'radio',
      options: ['default', 'bare']
    },
  }
};

export const Default: StoryObj<typeof SLCard> = {
  args: {
    children: (
      <>
        <div slot="actions-start"><Fpo>Card Actions Start</Fpo></div>
        <div slot="actions-end"><Fpo>Card Actions End</Fpo></div>
        <div slot="image"><Fpo>Card Image</Fpo></div>
        <div slot="header"><Fpo>Card Header</Fpo></div>
        <div><Fpo>Card Content</Fpo></div>
      </>
    ),
  },
};

export const Bare: StoryObj<typeof SLCard> = { args: {
  variant: 'bare',
} };

export const LayoutInline: StoryObj<typeof SLCard> = { args: {
  variant: 'inline',
} };

export const WithContent: StoryObj<typeof SLCard> = {
  args: {
    children: (
      <>
        <SLChip slot="actions-start">Label</SLChip>
        <SLPopover slot="actions-end" menuId="card-menu">
          <SLButton slot="trigger" hideText={true} variant="tertiary">
            <SLIconDotsVertical slot="before"></SLIconDotsVertical>
          </SLButton>
          <SLMenu id="card-menu">
            <SLMenuItem>List Item 1</SLMenuItem>
            <SLMenuItem>List Item 2</SLMenuItem>
            <SLMenuItem>List Item 3</SLMenuItem>
            <SLMenuItem>List Item 1</SLMenuItem>
            <SLMenuItem>List Item 2</SLMenuItem>
            <SLMenuItem>List Item 3</SLMenuItem>
          </SLMenu>
        </SLPopover>
        <img slot="image" alt="card image" src="https://fakeimg.pl/600x400" />
        <SLHeading slot="header" tagName="h3" variant="sm">Card title</SLHeading>
        <SLTextPassage>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed dui leo, lacinia ut finibus sed, consectetur quis enim.</SLTextPassage>
      </>
    ),
  },
};
