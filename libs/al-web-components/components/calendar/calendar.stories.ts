import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import './calendar';

export default {
  title: 'Atoms/Calendar',
  component: 'al-calendar',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onCalendarChange']
    }
  },
  decorators: [ withActions ],
};

export const Default = (args) => html` <al-calendar ${spread(args)}></al-calendar> `;

export const DisabledMinMaxDate = () => html` <al-calendar disabledMinDate="2023/10/03" disabledMaxDate="2023/12/30"></al-calendar> `;

export const MultiYear = () => html` <al-calendar multiyear="30"></al-calendar> `;

export const StartOnMonday = () => html` <al-calendar ?startOnMonday=${true} ?isDayShortHand=${true}></al-calendar> `;
