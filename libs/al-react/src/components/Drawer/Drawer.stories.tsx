import type { StoryObj } from '@storybook/react-vite';
import { ALDrawer, ALButton, ALIconMenu, ALLayout} from '../..';
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
        <ALButton slot="trigger" hideText={true} variant="bare">Toggle Drawer<ALIconMenu slot="before"></ALIconMenu></ALButton>
        <div  slot="header">
          <Fpo>Drawer Title</Fpo>
        </div>
        <Fpo>Drawer content</Fpo>
        <ALLayout slot="footer" direction="row" grow>
          <ALButton variant="tertiary">Submit</ALButton>
          <ALButton>Cancel</ALButton>
        </ALLayout>
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