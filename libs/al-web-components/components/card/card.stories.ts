import { html } from 'lit';
import { spread } from '../../directives/spread';
import './card';
import '../../.storybook/components/f-po/f-po';
import { loremSentences, placeholderImage, placeholderImages } from '../../.storybook/fixtures';
import '../chip/chip';
import '../heading/heading';
import '../icon/icons/dots-vertical';
import '../text-block/text-block';
import '../button/button';
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

const Template = (args) => html`
<al-card ${spread(args)}>
  <f-po slot="actions-start">Card Action Start</f-po>
  <f-po slot="actions-end">Card Action End</f-po>
  <img slot="image" alt="" src=${placeholderImage(600, 400, { text: 'Card Image' })} />
  <f-po slot="header">Card Header</f-po>
  <f-po>Card Content</f-po>
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
        <al-icon-dots-vertical slot="before"></al-icon-dots-vertical>
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
<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
  <div>
    <al-card fill>
      <al-heading slot="header" tagName="h3" variant="sm" ?isBold=${true}>fill</al-heading>
      <al-text-block>Short.</al-text-block>
    </al-card>
  </div>
  <div>
    <al-card>
      <al-heading slot="header" tagName="h3" variant="sm" ?isBold=${true}>no fill</al-heading>
      <al-text-block>Short.</al-text-block>
    </al-card>
  </div>
  <div>
    <al-card>
      <al-heading slot="header" tagName="h3" variant="sm" ?isBold=${true}>Tall sibling</al-heading>
      <al-text-block>${loremSentences(4, 'card-fill')}</al-text-block>
    </al-card>
  </div>
</div>`;

export const Fill = TemplateFill.bind({});
Fill.args = {};
