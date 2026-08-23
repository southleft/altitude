import type { StoryObj } from '@storybook/react-vite';
import { ALCard, ALHeading, ALButton, ALChip, ALIconDotsVertical, ALPopover, ALMenu, ALMenuItem, ALTextBlock } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';
import { loremSentences, placeholderImage, placeholderImages } from '../../../../al-web-components/.storybook/fixtures';

export default {
  title: 'Molecules/Card',
  component: ALCard,
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

export const Default: StoryObj<typeof ALCard> = {
  args: {
    children: (
      <>
        <div slot="actions-start"><Fpo>Card Actions Start</Fpo></div>
        <div slot="actions-end"><Fpo>Card Actions End</Fpo></div>
        <img slot="image" alt="" src={placeholderImage(600, 400, { text: 'Card Image' })} />
        <div slot="header"><Fpo>Card Header</Fpo></div>
        <div><Fpo>Card Content</Fpo></div>
      </>
    ),
  },
};

export const Bare: StoryObj<typeof ALCard> = { args: {
  variant: 'bare',
} };

export const LayoutInline: StoryObj<typeof ALCard> = { args: {
  variant: 'inline',
} };

export const WithContent: StoryObj<typeof ALCard> = {
  args: {
    children: (
      <>
        <ALChip slot="actions-start">Label</ALChip>
        <ALPopover slot="actions-end" menuId="card-menu">
          <ALButton slot="trigger" hideText={true} variant="bare">
            <ALIconDotsVertical slot="before"></ALIconDotsVertical>
          </ALButton>
          <ALMenu id="card-menu">
            <ALMenuItem>List Item 1</ALMenuItem>
            <ALMenuItem>List Item 2</ALMenuItem>
            <ALMenuItem>List Item 3</ALMenuItem>
            <ALMenuItem>List Item 1</ALMenuItem>
            <ALMenuItem>List Item 2</ALMenuItem>
            <ALMenuItem>List Item 3</ALMenuItem>
          </ALMenu>
        </ALPopover>
        <img slot="image" alt="card image" src={placeholderImages.card} />
        <ALHeading slot="header" tagName="h3" variant="sm">Card title</ALHeading>
        <ALTextBlock>{loremSentences(2, 'card')}</ALTextBlock>
      </>
    ),
  },
};
