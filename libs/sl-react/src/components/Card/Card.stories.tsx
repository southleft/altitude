import type { StoryObj } from '@storybook/react-webpack5';
import { SLCard, SLHeading, SLButton, SLChip, SLIconDone, SLIconEmoji, SLTextPassage } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Molecules/Card',
  component: SLCard,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
  },
};

export const Default: StoryObj<typeof SLCard> = {
  args: {
    children: (
      <>
        <div slot="actions-left"><Fpo>Card Actions Left</Fpo></div>
        <div slot="actions-right"><Fpo>Card Actions Right</Fpo></div>
        <div slot="image"><Fpo>Card Image</Fpo></div>
        <div slot="header"><Fpo>Card Header</Fpo></div>
        <div><Fpo>Card Content</Fpo></div>
      </>
    ),
  },
};

export const WithContent: StoryObj<typeof SLCard> = {
  args: {
    children: (
      <>
        <SLChip slot="actions-left">Label</SLChip>
        <SLButton slot="actions-right" variant="secondary" hideText={true}>Button<SLIconDone slot="after"></SLIconDone></SLButton>
        <img slot="image" alt="card image" src="https://fakeimg.pl/600x400" />
        <SLIconEmoji size="md" slot="header"></SLIconEmoji>
        <SLHeading slot="header" tagName="h3" variant="sm">Card title</SLHeading>
        <SLTextPassage>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed dui leo, lacinia ut finibus sed, consectetur quis enim.</SLTextPassage>
      </>
    ),
  },
};
