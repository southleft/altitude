import type { StoryObj } from '@storybook/react-webpack5';
import { ALDivider } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Atoms/Divider',
  component: ALDivider,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered'
  },
  argTypes: {
    variant: {
      control: 'radio',
      options: ['default', 'vertical'],
    },
  },
};

export const Default: StoryObj<typeof ALDivider> = {
  args: {},
  decorators: [
    (Story) => (
      <div className="al-u-spacing">
        <Fpo>Layout Section</Fpo>
        {Story()}
        <Fpo>Layout Section</Fpo>
      </div>
    )
  ],
 };

export const Vertical: StoryObj<typeof ALDivider> = {
  args: {
    variant: 'vertical',
  },
  decorators: [
    (Story) => (
      <div className="al-u-spacing--left" style={{ display: 'flex' }}>
        <Fpo>Layout Section</Fpo>
        {Story()}
        <Fpo>Layout Section</Fpo>
      </div>
    )
  ],
 };