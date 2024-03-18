import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALCalendar } from '../..';

export default {
  title: 'Atoms/Calendar',
  component: ALCalendar,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onCalendarChange']
    }
  }
};

export const Default: StoryObj<typeof ALCalendar> = { args: {} };

export const MindisabledMaxDate: StoryObj<typeof ALCalendar> = {
  args: {
    disabledMinDate: '2023/10/03',
    disabledMaxDate: '2023/12/30'
  }
};

export const MultiYear: StoryObj<typeof ALCalendar> = {
  args: {
    multiyear: '30'
  }
};

export const StartOnMonday: StoryObj<typeof ALCalendar> = {
  args: {
    startOnMonday: true,
    isDayShortHand: true
  }
};
