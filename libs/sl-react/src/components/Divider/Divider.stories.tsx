import type { StoryObj } from '@storybook/react-webpack5';
import { SLDivider } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Atoms/Divider',
  component: SLDivider,
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

export const Default: StoryObj<typeof SLDivider> = {
  args: {},
  decorators: [
    (Story) => (
      <div className="sl-u-spacing">
        <Fpo>Layout Section</Fpo>
        {Story()}
        <Fpo>Layout Section</Fpo>
      </div>
    )
  ],
 };

export const Vertical: StoryObj<typeof SLDivider> = {
  args: {
    variant: 'vertical',
  },
  decorators: [
    (Story) => (
      <div className="sl-u-spacing--left" style={{ display: 'flex' }}>
        <Fpo>Layout Section</Fpo>
        {Story()}
        <Fpo>Layout Section</Fpo>
      </div>
    )
  ],
 };