import { html } from 'lit';
import { spread } from '../../directives/spread';
import './header';
import '../../.storybook/components/f-po/f-po';
import '../../components/button/button';
import * as SearchForm from '../../components/search-form/search-form.stories.ts';
import * as Drawer from '../../components/drawer/drawer.stories.ts';
import * as Avatar from '../../components/avatar/avatar.stories.ts';
import '../../components/icon/icons/menu';

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

const TemplateWithContent = (args) => html`
<sl-header ${spread(args)}>
  <img slot="before" src="images/logo.svg" alt="logo" style=${`max-width: 200px;`}/>
  ${SearchForm.Default({})}
  <div slot="after">${Avatar.HasBadge({hasBadge: true, badgeVariant: 'success'})}</div>
  <div slot="after">${Drawer.WithBackdrop({hasBackdrop: true})}</div>
</sl-header>`;

export const WithContent = TemplateWithContent.bind({});
WithContent.args = {};