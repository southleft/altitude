import { html } from 'lit';
import { spread } from '../../directives/spread';
import './card';
import { loremSentences, placeholderImage, placeholderImages } from '../../fixtures';
import '../chip/chip';
import '../heading/heading';
import '../text-block/text-block';
import '../button/button';
import '../layout/layout';
import '../icon/icons/dots-horizontal';
import '../badge/badge';
import '../avatar/avatar';
import '../popover/popover';
import '../menu/menu';
import '../menu-item/menu-item';

export default {
  title: 'Molecules/Card',
  component: 'al-card',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
  },
  argTypes: {
    layout: {
      control: 'radio',
      options: ['default', 'row']
    },
    variant: {
      control: 'radio',
      options: ['default', 'bare']
    },
  }
};

/*
 * Content is 1:1 with the v2 canvas card: a hairline container, a divided
 * header, and a footer that reads as a footer because of its rule and tint,
 * not because of a shadow.
 */
/*
 * The full article card — every region the component owns, on one specimen:
 * media, a header row, a byline, body copy, tags and a footer.
 *
 * Every row is composed with <al-layout>, never with a bespoke wrapper or an
 * inline flex rule. That is what keeps the card reusable for layouts it has
 * not been designed against yet: the card owns its regions (their padding,
 * rules and footer tint) and <al-layout> arranges whatever is put inside one.
 *
 * The title sits in its own <al-layout grow>: that is what pushes the overflow
 * menu to the trailing edge. justify="between" alone does not, because
 * <al-popover> is display:contents — it never becomes a flex item, so its
 * trigger and menu are hoisted into the row as two separate items and
 * space-between distributes three items instead of two.
 *
 * Copy is 1:1 with the v2 canvas.
 */
const Template = (args) => html`
<al-card ${spread(args)}>
  <img slot="image" alt="" src=${placeholderImage(600, 300, { text: 'Altitude v2' })} />

  <al-layout slot="header" direction="row" gap="sm" align="center" grow>
    <al-layout grow>
      <al-heading tagName="h3" variant="sm" ?isBold=${true}>Flat, minimal, type-first.</al-heading>
    </al-layout>
    <al-popover menuId="card-actions" variant="menu">
      <al-button slot="trigger" variant="bare" size="sm" ?hideText=${true} label="Card actions">
        <al-icon-dots-horizontal slot="before"></al-icon-dots-horizontal>
      </al-button>
      <al-menu id="card-actions">
        <al-menu-item>Duplicate</al-menu-item>
        <al-menu-item>Favorite</al-menu-item>
        <al-menu-item>Remove</al-menu-item>
      </al-menu>
    </al-popover>
  </al-layout>

  <al-layout direction="column" gap="sm">
    <al-layout direction="row" gap="sm" align="center">
      <al-avatar variant="sm">MK</al-avatar>
      <al-text-block>M. Kim · 4h ago</al-text-block>
      <al-badge variant="success">Active</al-badge>
    </al-layout>

    <al-text-block>
      Same components, reimagined. Hairline borders on warm paper neutrals, one refined blue,
      shadows reserved for overlays. Public Sans for UI, IBM Plex Mono for metadata.
    </al-text-block>

    <al-layout direction="row" gap="sm" wrap>
      <al-chip>Design</al-chip>
      <al-chip variant="secondary">Engineering</al-chip>
      <al-chip variant="info">Research</al-chip>
    </al-layout>
  </al-layout>

  <al-layout slot="footer" direction="row" gap="sm" align="center" justify="end">
    <al-button variant="bare" size="sm">Dismiss</al-button>
    <al-button size="sm">Continue</al-button>
  </al-layout>
</al-card>`;

export const Default = Template.bind({});
Default.args = {};

export const Bare = Template.bind({});
Bare.args = {
  variant: 'bare'
};

export const LayoutInline = Template.bind({});
LayoutInline.args = {
  layout: 'inline'
};

const TemplateWithContent = (args) => html`
<al-card ${spread(args)}>
  <al-chip slot="actions-start">Label</al-chip>
    <al-popover slot="actions-end" menuId="card-menu" variant="menu">
      <al-button slot="trigger" variant="bare" ?hideText=${true} label="Card actions">
        <al-icon-dots-horizontal slot="before"></al-icon-dots-horizontal>
      </al-button>
      <al-menu id="card-menu">
        <al-menu-item>List Item 1</al-menu-item>
        <al-menu-item>List Item 2</al-menu-item>
        <al-menu-item>List Item 3</al-menu-item>
        <al-menu-item>List Item 1</al-menu-item>
        <al-menu-item>List Item 2</al-menu-item>
        <al-menu-item>List Item 3</al-menu-item>
      </al-menu>
    </al-popover>
  <img slot="image" alt="card image" src=${placeholderImages.card} />
  <al-heading slot="header" tagName="h3" variant="sm" ?isBold=${true}>Card title</al-heading>
  <al-text-block>${loremSentences(2, 'card')}</al-text-block>
</al-card>`;

export const WithContent = TemplateWithContent.bind({});
WithContent.args = {};


/**
 * `fill` makes the card take the available block size instead of hugging its
 * content, so a row of cards shares one height and their footers line up.
 *
 * The left card is `fill`; the right one is not. Both sit in the same grid row
 * beside a taller sibling, which is the only situation where the difference is
 * visible — a card with nothing to stretch against looks identical either way.
 *
 * It has to be a property, not something the page writes from outside:
 * `:host` is `display: contents`, so `<al-card>` generates no box of its own
 * and a `height: 100%` set on the element is dropped.
 */
const TemplateFill = () => html`
<al-layout variant="grid" .columns=${3} gutter="md">
  <al-card fill>
    <al-heading slot="header" tagName="h3" variant="sm" ?isBold=${true}>fill</al-heading>
    <al-text-block>Short.</al-text-block>
  </al-card>
  <al-card>
    <al-heading slot="header" tagName="h3" variant="sm" ?isBold=${true}>no fill</al-heading>
    <al-text-block>Short.</al-text-block>
  </al-card>
  <al-card>
    <al-heading slot="header" tagName="h3" variant="sm" ?isBold=${true}>Tall sibling</al-heading>
    <al-text-block>${loremSentences(4, 'card-fill')}</al-text-block>
  </al-card>
</al-layout>`;

export const Fill = TemplateFill.bind({});
Fill.args = {};

/**
 * The `image` slot. The v2 canvas card carries no image, so it is shown here
 * rather than in the default specimen.
 */
const TemplateWithImage = (args) => html`
<al-card ${spread(args)}>
  <img slot="image" alt="" src=${placeholderImage(600, 400, { text: 'Card Image' })} />
  <al-heading slot="header" tagName="h3" variant="sm" ?isBold=${true}>Card title</al-heading>
  <al-text-block>Flat card: hairline border, 10px radius, no shadow. Structure comes from dividers, not elevation.</al-text-block>
</al-card>`;

export const WithImage = TemplateWithImage.bind({});
WithImage.args = {};
