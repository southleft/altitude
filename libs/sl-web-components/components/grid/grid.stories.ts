import { html } from 'lit';
import '../../.storybook/components/f-po/f-po';
import { spread } from '../../directives/spread';
import '../grid-item/grid-item';
import './grid';

export default {
  title: 'Organisms/Grid',
  component: 'sl-grid',
  tags: [ 'autodocs' ],
  parameters: { status: { type: 'beta' } }
};

export const Default = (args) => html`
  <sl-grid ${spread(args)}>
    <sl-grid-item>
      <f-po>Grid Item 1</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 2</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 3</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 4</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 5</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 6</f-po>
    </sl-grid-item>
  </sl-grid>
`;

export const SideBySide = () => html`
  <sl-grid variant="side-by-side">
    <sl-grid-item>
      <f-po>Grid Item 1</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 2</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 3</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 4</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 5</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 6</f-po>
    </sl-grid-item>
  </sl-grid>
`;

export const TwoToThreeUp = () => html`
  <sl-grid variant="2-3up">
    <sl-grid-item>
      <f-po>Grid Item 1</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 2</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 3</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 4</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 5</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 6</f-po>
    </sl-grid-item>
  </sl-grid>
`;

export const TwoUp = () => html`
  <sl-grid variant="2up">
    <sl-grid-item>
      <f-po>Grid Item 1</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 2</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 3</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 4</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 5</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 6</f-po>
    </sl-grid-item>
  </sl-grid>
`;

export const TwoUpBreakFaster = () => html`
  <sl-grid variant="2up" break="faster">
    <sl-grid-item>
      <f-po>Grid Item 1</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 2</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 3</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 4</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 5</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 6</f-po>
    </sl-grid-item>
  </sl-grid>
`;

export const TwoUpBreakSlower = () => html`
  <sl-grid variant="2up" break="slower">
    <sl-grid-item>
      <f-po>Grid Item 1</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 2</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 3</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 4</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 5</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 6</f-po>
    </sl-grid-item>
  </sl-grid>
`;

export const ThreeUp = () => html`
  <sl-grid variant="3up">
    <sl-grid-item>
      <f-po>Grid Item 1</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 2</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 3</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 4</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 5</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 6</f-po>
    </sl-grid-item>
  </sl-grid>
`;

export const OneToThreeUp = () => html`
  <sl-grid variant="1-3up">
    <sl-grid-item>
      <f-po>Grid Item 1</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 2</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 3</f-po>
    </sl-grid-item>
  </sl-grid>
`;

export const OneToThreeUpBreakFaster = () => html`
  <sl-grid variant="1-3up" break="faster">
    <sl-grid-item>
      <f-po>Grid Item 1</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 2</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 3</f-po>
    </sl-grid-item>
  </sl-grid>
`;

export const OneToThreeUpBreakSlower = () => html`
  <sl-grid variant="1-3up" break="slower">
    <sl-grid-item>
      <f-po>Grid Item 1</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 2</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 3</f-po>
    </sl-grid-item>
  </sl-grid>
`;

export const OneToFourUp = () => html`
  <sl-grid variant="1-4up">
    <sl-grid-item>
      <f-po>Grid Item 1</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 2</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 3</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 4</f-po>
    </sl-grid-item>
  </sl-grid>
`;

export const TwoToFourUp = () => html`
  <sl-grid variant="2-4up">
    <sl-grid-item>
      <f-po>Grid Item 1</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 2</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 3</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 4</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 5</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 6</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 7</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 8</f-po>
    </sl-grid-item>
  </sl-grid>
`;

export const TwoToThreeFourUp = () => html`
  <sl-grid variant="2-3-4up">
    <sl-grid-item>
      <f-po>Grid Item 1</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 2</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 3</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 4</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 5</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 6</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 7</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 8</f-po>
    </sl-grid-item>
  </sl-grid>
`;

export const OneToTwoToFourUp = () => html`
  <sl-grid variant="1-2-4up">
    <sl-grid-item>
      <f-po>Grid Item 1</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 2</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 3</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 4</f-po>
    </sl-grid-item>
  </sl-grid>
`;

export const FourUp = () => html`
  <sl-grid variant="4up">
    <sl-grid-item>
      <f-po>Grid Item 1</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 2</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 3</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 4</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 5</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 6</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 7</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 8</f-po>
    </sl-grid-item>
  </sl-grid>
`;

export const TwoToFourToFiveUp = () => html`
  <sl-grid variant="2-4-5up">
    <sl-grid-item>
      <f-po>Grid Item 1</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 2</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 3</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 4</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 5</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 6</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 7</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 8</f-po>
    </sl-grid-item>
  </sl-grid>
`;

export const TwoToThreeToFourToFiveUp = () => html`
  <sl-grid variant="2-3-4-5up">
    <sl-grid-item>
      <f-po>Grid Item 1</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 2</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 3</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 4</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 5</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 6</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 7</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 8</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 9</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 10</f-po>
    </sl-grid-item>
  </sl-grid>
`;

export const FiveUp = () => html`
  <sl-grid variant="5up">
    <sl-grid-item>
      <f-po>Grid Item 1</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 2</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 3</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 4</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 5</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 6</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 7</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 8</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 9</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 10</f-po>
    </sl-grid-item>
  </sl-grid>
`;

export const GapNoneFourUp = () => html`
  <sl-grid variant="4up" gap="none">
    <sl-grid-item>
      <f-po>Grid Item 1</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 2</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 3</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 4</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 5</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 6</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 7</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 8</f-po>
    </sl-grid-item>
  </sl-grid>
`;

export const GapSmallFourUp = () => html`
  <sl-grid variant="4up" gap="sm">
    <sl-grid-item>
      <f-po>Grid Item 1</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 2</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 3</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 4</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 5</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 6</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 7</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 8</f-po>
    </sl-grid-item>
  </sl-grid>
`;

export const GapLargeFourUp = () => html`
  <sl-grid variant="4up" gap="lg">
    <sl-grid-item>
      <f-po>Grid Item 1</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 2</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 3</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 4</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 5</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 6</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 7</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 8</f-po>
    </sl-grid-item>
  </sl-grid>
`;

export const TwoTo4to6Up = () => html`
  <sl-grid variant="2-4-6up">
    <sl-grid-item>
      <f-po>Grid Item 1</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 2</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 3</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 4</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 5</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 6</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 7</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 8</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 9</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 10</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 11</f-po>
    </sl-grid-item>
    <sl-grid-item>
      <f-po>Grid Item 12</f-po>
    </sl-grid-item>
  </sl-grid>
`;
