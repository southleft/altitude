import {html} from 'lit';
import { spread } from '../../../directives/spread';
import './job-board';

export default {
  title: 'Pages/Job Board',
  component: 'al-job-board',
  parameters: {
    status: { type: 'beta' },
    layout: 'fullscreen'
  },
  tags: [ 'autodocs' ]
};

const Template = (args) => html`<al-job-board ${spread(args)} data-testid="job-board">Hello world</al-job-board>`;

export const Default = Template.bind({});
Default.args = {};