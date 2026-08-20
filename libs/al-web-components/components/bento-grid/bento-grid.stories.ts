import { html } from 'lit';
import './bento-grid';
import '../bento-item/bento-item';
import '../../.storybook/components/f-po/f-po';
import '../card/card';
import '../heading/heading';
import '../text-passage/text-passage';

export default {
  title: 'Organisms/Bento Grid',
  component: 'al-bento-grid',
  tags: ['autodocs'],
  parameters: {
    status: { type: 'beta' },
    layout: 'padded'
  }
};

export const Default = () => html`
  <al-bento-grid>
    <al-bento-item colSpan="8" rowSpan="2">
      <f-po style="height:100%;">8x2</f-po>
    </al-bento-item>
    <al-bento-item colSpan="4">
      <f-po style="height:100%;">4x1</f-po>
    </al-bento-item>
    <al-bento-item colSpan="4">
      <f-po style="height:100%;">4x1</f-po>
    </al-bento-item>
    <al-bento-item colSpan="6">
      <f-po style="height:100%;">6x1</f-po>
    </al-bento-item>
    <al-bento-item colSpan="6">
      <f-po style="height:100%;">6x1</f-po>
    </al-bento-item>
  </al-bento-grid>
`;

export const WithCards = () => html`
  <al-bento-grid>
    <al-bento-item colSpan="8" rowSpan="2">
      <al-card style="height:100%; box-sizing:border-box;">
        <div slot="header"><al-heading tagName="h3" variant="md" ?isBold=${true}>Flagship feature</al-heading></div>
        <al-text-passage>A wide, tall tile draws the eye first — use it for the feature you most want noticed.</al-text-passage>
      </al-card>
    </al-bento-item>
    <al-bento-item colSpan="4">
      <al-card style="height:100%; box-sizing:border-box;">
        <div slot="header"><al-heading tagName="h3" variant="sm" ?isBold=${true}>Secondary</al-heading></div>
        <al-text-passage>Smaller tiles round out the grid.</al-text-passage>
      </al-card>
    </al-bento-item>
    <al-bento-item colSpan="4">
      <al-card style="height:100%; box-sizing:border-box;">
        <div slot="header"><al-heading tagName="h3" variant="sm" ?isBold=${true}>Secondary</al-heading></div>
        <al-text-passage>Any content composes — cards, stats, media.</al-text-passage>
      </al-card>
    </al-bento-item>
  </al-bento-grid>
`;
