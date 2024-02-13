import { html } from 'lit';
import { spread } from '../../directives/spread';
import './header';
import '../../.storybook/components/f-po/f-po';
import '../../components/button/button';
import * as Search from '../../components/search/search.stories.ts';
import * as Drawer from '../../components/drawer/drawer.stories.ts';
import * as Avatar from '../../components/avatar/avatar.stories.ts';
import '../../components/icon/icons/menu';
import '../../components/popover/popover';
import '../../components/menu/menu';
import '../../components/menu-item/menu-item';
import '../../components/divider/divider';

export default {
  title: 'Organisms/Header',
  component: 'sl-header',
  parameters: { status: { type: 'beta' } },
  tags: [ 'autodocs' ],
};

const Template = (args) => html`
<sl-header ${spread(args)} data-testid="header">
  <f-po slot="before">Slot Before</f-po>
  <f-po>Slot Main</f-po>
  <f-po slot="after">Slot After</f-po>
</sl-header>`;

export const Default = Template.bind({});
Default.args = {};