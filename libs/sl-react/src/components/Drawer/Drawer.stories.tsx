import type { StoryObj } from '@storybook/react-webpack5';
import { SLDrawer, SLButton, SLButtonGroup } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Molecules/Drawer',
  component: SLDrawer,
  parameters: { status: { type: 'beta' } },
  args: {
    children: (
      <>
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
  },
  decorators: [
    (Story) => (
      <div>
        <SLButton onClick={toggleDrawer}>Toggle Drawer</SLButton>
        <div className="c-drawer">{Story()}</div>
      </div>
    )
  ],
};

function toggleDrawer() {
  const drawer = document.querySelector<any>('.c-drawer').querySelector('*');
  if (drawer) {
    drawer.toggle();
  }
}

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