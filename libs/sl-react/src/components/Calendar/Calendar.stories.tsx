import type { StoryObj } from '@storybook/react-webpack5';
import { SLCalendar } from '../..';

export default {
  title: 'Boilerplate/Calendar',
  component: SLCalendar,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onCalendarChange']
    }
  }
};

export const Default: StoryObj<typeof SLCalendar> = { args: {} };

export const MindisabledMaxDate: StoryObj<typeof SLCalendar> = {
  args: {
    disabledMinDate: '2023/10/03',
    disabledMaxDate: '2023/12/30'
  }
};

export const MultiYear: StoryObj<typeof SLCalendar> = {
  args: {
    multiyear: '30'
  }
};

export const StartOnMonday: StoryObj<typeof SLCalendar> = {
  args: {
    startOnMonday: true,
    isDayShortHand: true
  }
};
