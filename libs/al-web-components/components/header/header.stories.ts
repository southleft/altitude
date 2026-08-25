import { html } from 'lit';
import { spread } from '../../directives/spread';
import './header';
import '../../fixtures/f-po/f-po';
import { placeholderImages } from '../../fixtures';
import '../../components/button/button';
import '../../components/layout/layout';
import '../../components/logo/logo';
import '../../components/link/link';
import '../../components/avatar/avatar';
import '../../components/icon/icons/menu';

export default {
  title: 'Organisms/Header',
  component: 'al-header',
  parameters: { status: { type: 'beta' }, layout: 'fullscreen' },
  tags: ['autodocs'],
  argTypes: {
    sticky: { control: 'boolean' },
    elevated: { control: 'boolean' }
  }
};

/**
 * The header owns the `<header>` landmark and the bar chrome — surface, minimum
 * height, and the opt-in `sticky` / `elevated` behaviour. It takes NO position on
 * what sits where: nest an `<al-layout>` and arrange there.
 *
 * These stories are one composition each, not a set of supported configurations.
 * Any arrangement `<al-layout>` can express, the header can hold.
 */
export const Default = (args) => html`
  <al-header ${spread(args)} data-testid="header">
    <al-layout direction="row" align="center" justify="between">
      <f-po>Start</f-po>
      <f-po>Middle</f-po>
      <f-po>End</f-po>
    </al-layout>
  </al-header>
`;
Default.args = { elevated: true };

/**
 * A wordmark, a nav, and an action cluster on one row. The nav takes the free
 * space via `grow`; the other two size to their content.
 */
export const BrandNavActions = (args) => html`
  <al-header ${spread(args)} data-testid="header">
    <al-layout direction="row" align="center" gap="lg">
      <al-logo variant="southleft"></al-logo>
      <al-layout direction="row" align="center" gap="md" grow>
        <al-link href="#">Product</al-link>
        <al-link href="#">Solutions</al-link>
        <al-link href="#">Developers</al-link>
        <al-link href="#">Pricing</al-link>
        <al-link href="#">Docs</al-link>
        <al-link href="#">Company</al-link>
      </al-layout>
      <al-layout direction="row" align="center" gap="sm">
        <al-button variant="tertiary">Sign in</al-button>
        <al-button>Get started</al-button>
      </al-layout>
    </al-layout>
  </al-header>
`;
BrandNavActions.args = { sticky: true, elevated: true };

/**
 * Nothing says the content must be a single row. A two-row header is just two
 * stacked `<al-layout>`s — the bar grows because its height is a MINIMUM, not a
 * fixed value.
 */
export const TwoRow = (args) => html`
  <al-header ${spread(args)} data-testid="header">
    <al-layout direction="column" gap="sm">
      <al-layout direction="row" align="center" justify="between">
        <al-logo variant="southleft"></al-logo>
        <al-avatar></al-avatar>
      </al-layout>
      <al-layout direction="row" align="center" gap="md">
        <al-link href="#">Overview</al-link>
        <al-link href="#">Activity</al-link>
        <al-link href="#">Settings</al-link>
      </al-layout>
    </al-layout>
  </al-header>
`;
TwoRow.args = { elevated: true };

/**
 * A brand mark is sized by the page, not the header — nothing here constrains it.
 */
export const WithImageLogo = (args) => html`
  <al-header ${spread(args)} data-testid="header">
    <al-layout direction="row" align="center" justify="between">
      <img src=${placeholderImages.logo} alt="Acme" width="160" height="40" />
      <al-button variant="tertiary">
        <al-icon-menu slot="before"></al-icon-menu>
        Menu
      </al-button>
    </al-layout>
  </al-header>
`;
WithImageLogo.args = {};

/**
 * Plain by default. Without `sticky` and `elevated` the header is an in-flow
 * landmark, suitable for an embedded or in-page header.
 */
export const Plain = (args) => html`
  <al-header ${spread(args)} data-testid="header">
    <al-layout direction="row" align="center" justify="between">
      <al-logo variant="southleft"></al-logo>
      <al-button variant="tertiary">Sign in</al-button>
    </al-layout>
  </al-header>
`;
Plain.args = {};
