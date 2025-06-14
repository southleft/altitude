import type { StoryObj } from '@storybook/react-webpack5';
import { ALButton } from 'al-react/src';

export default {
  title: 'Story UI Pages/Button',
  component: ALButton,
};

export const Default: StoryObj<typeof ALButton> = {
  args: {
    children: 'Click me',
    type: 'button',
    options: 'default'
  }
};

export const Primary: StoryObj<typeof ALButton> = {
  args: {
    children: 'Click me',
    type: 'button', 
    options: 'primary'
  }
};

export const Secondary: StoryObj<typeof ALButton> = {
  args: {
    children: 'Click me',
    type: 'button',
    options: 'secondary'  
  }
};

export const Tertiary: StoryObj<typeof ALButton> = {
  args: {  
    children: 'Click me',
    type: 'button',
    options: 'tertiary'
  }
};