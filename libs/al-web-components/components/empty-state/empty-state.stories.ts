import { html } from 'lit';
import { spread } from '../../directives/spread';
import './empty-state';
import '../button/button';
import { loremSentences, placeholderImage } from '../../.storybook/fixtures';
import '../icon/icon';
import { magnifyingGlass, tray } from '../icon/glyphs';
import { registerIcons } from '../icon/registry';

registerIcons({ 'magnifying-glass': magnifyingGlass, tray });

export default {
  title: 'Molecules/Empty State',
  component: 'al-empty-state',
  tags: ['autodocs'],
  parameters: {
    status: { type: 'beta' }
  }
};

const Template = (args) => html`<al-empty-state ${spread(args)}></al-empty-state>`;

export const Default = Template.bind({});
Default.args = {
  heading: 'No results found',
  description: 'Try adjusting your filters or search terms.'
};

export const WithIcon = (args) => html`
  <al-empty-state ${spread(args)}>
    <al-icon slot="icon" name="magnifying-glass"></al-icon>
  </al-empty-state>
`;
WithIcon.args = {
  heading: 'No results found',
  description: 'Try adjusting your filters or search terms.'
};

export const WithIllustration = (args) => html`
  <al-empty-state ${spread(args)}>
    <img slot="icon" src=${placeholderImage(96, 96)} alt="" width="96" height="96" />
    <al-button slot="actions">Import data</al-button>
  </al-empty-state>
`;
WithIllustration.args = {
  heading: 'Nothing to show yet',
  description: loremSentences(1, 'empty-state', false)
};

export const WithActions = (args) => html`
  <al-empty-state ${spread(args)}>
    <al-icon slot="icon" name="tray"></al-icon>
    <al-button slot="actions">Create your first project</al-button>
  </al-empty-state>
`;
WithActions.args = {
  heading: 'No projects yet',
  description: 'Projects you create will show up here.'
};
