import type { StoryObj } from '@storybook/react-webpack5';
import { ALDrawer, ALButton, ALIconMenu, ALButtonGroup } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Molecules/Drawer',
  component: ALDrawer,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onDrawerOpen', 'onDrawerClose', 'onDrawerCloseButton']
    },
    controls: {
      exclude: ['ariaLabelledBy']
    },
  },
  args: {
    children: (
      <>
        <ALButton slot="trigger" hideText={true} variant="tertiary">Toggle Drawer<ALIconMenu slot="before"></ALIconMenu></ALButton>
        <div  slot="header">
          <Fpo>Drawer Title</Fpo>
        </div>
        <Fpo>Drawer content</Fpo>
        <ALButtonGroup slot="footer">
          <ALButton variant="secondary">Submit</ALButton>
          <ALButton>Cancel</ALButton>
        </ALButtonGroup>
      </>
    )
  }
};


export const Default: StoryObj<typeof ALDrawer> = { args: {} };

export const AlignmentRight: StoryObj<typeof ALDrawer> = { args: {
  alignment: 'right'
} };

export const WithBackdrop: StoryObj<typeof ALDrawer> = { args: {
  hasBackdrop: true
} };

export const WithWidth: StoryObj<typeof ALDrawer> = { args: {
  width: 400
} };