import type { StoryObj } from '@storybook/react-webpack5';
import { SLDrawer, SLButton, SLIconMenu, SLButtonGroup } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Molecules/Drawer',
  component: SLDrawer,
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
        <SLButton slot="trigger" hideText={true} variant="tertiary">Toggle Drawer<SLIconMenu slot="before"></SLIconMenu></SLButton>
        <div  slot="header">
          <Fpo>Drawer Title</Fpo>
        </div>
        <Fpo>Drawer content</Fpo>
        <SLButtonGroup slot="footer">
          <SLButton variant="secondary">Submit</SLButton>
          <SLButton>Cancel</SLButton>
        </SLButtonGroup>
      </>
    )
  }
};


export const Default: StoryObj<typeof SLDrawer> = { args: {} };

export const AlignmentRight: StoryObj<typeof SLDrawer> = { args: {
  alignment: 'right'
} };

export const WithBackdrop: StoryObj<typeof SLDrawer> = { args: {
  hasBackdrop: true
} };

export const WithWidth: StoryObj<typeof SLDrawer> = { args: {
  width: 400
} };