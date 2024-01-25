import { html } from 'lit';
import { spread } from '../../directives/spread';
import './calendar';

export default {
  title: 'Components/Calendar',
  component: 'sl-calendar',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['change']
    }
  }
};

export const Default = (args) => html` <sl-calendar ${spread(args)}></sl-calendar> `;

export const DisabledMinMaxDate = () => html` <sl-calendar disabledMinDate="2023/10/03" disabledMaxDate="2023/12/30"></sl-calendar> `;

export const MultiYear = () => html` <sl-calendar multiyear="30"></sl-calendar> `;

export const StartOnMonday = () => html` <sl-calendar ?startOnMonday=${true} ?isDayShortHand=${true}></sl-calendar> `;
