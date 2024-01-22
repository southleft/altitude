import { within } from '@storybook/testing-library';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import './progress';

export default {
  title: 'Components/Progress',
  component: 'sl-progress',
  tags: [  'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['progressChange' ]
    },
    layout: 'padded'
  },
  argTypes: {
    isCircle: {
      control: 'boolean'
    },
    circleSize: {
      options: ['default', 'md', 'lg', 'xl'],
      control: { type: 'radio' }
    },
    showLabel: {
      control: 'boolean'
    },
    labelType: {
      options: ['default', 'ratio'],
      control: { type: 'radio' }
    },
    duration: {
      control: 'number'
    },
    currentProgress: {
      control: 'number'
    },
    endProgress: {
      control: 'number'
    },
    labelAria: {
      control: 'text'
    }
  }
};

const Template = (args) => html`
  <sl-progress ${spread(args)} data-testid="progress"></sl-progress>
`;

export const Default = Template.bind({});
Default.args = {};

export const DefaultReversed = Template.bind({});
DefaultReversed.args = {
  currentProgress: '100',
  endProgress: '0'
};

export const DefaultDuration = Template.bind({});
DefaultDuration.args = {
  duration: '3',
};

export const DefaultDurationReversed = Template.bind({});
DefaultDurationReversed.args = {
  ...DefaultReversed.args,
  duration: '3'
};

export const DefaultShowLabel = Template.bind({});
DefaultShowLabel.args = {
  showLabel: true
};

export const DefaultShowLabelRatio = Template.bind({});
DefaultShowLabelRatio.args = {
  ...DefaultShowLabel.args,
  labelType: 'ratio',
  endProgress: '1000'
};

export const DefaultReversedShowLabel = Template.bind({});
DefaultReversedShowLabel.args = {
  ...DefaultReversed.args,
  showLabel: true
};

export const DefaultReversedShowLabelRatio = Template.bind({});
DefaultReversedShowLabelRatio.args = {
  ...DefaultReversedShowLabel.args,
  labelType: 'ratio'
};

export const DefaultDurationShowLabel = Template.bind({});
DefaultDurationShowLabel.args = {
  ...DefaultDuration.args,
  showLabel: true
};

export const DefaultDurationReversedShowLabel = Template.bind({});
DefaultDurationReversedShowLabel.args = {
  ...DefaultDurationReversed.args,
  showLabel: true
};

export const Circle = Template.bind({});
Circle.args = {
  isCircle: true
};

export const CircleReversed = Template.bind({});
CircleReversed.args = {
  ...Circle.args,
  currentProgress: '100',
  endProgress: '0'
};

export const CircleDuration = Template.bind({});
CircleDuration.args = {
  ...Circle.args,
  duration: '3'
};

export const CircleDurationReversed = Template.bind({});
CircleDurationReversed.args = {
  ...CircleReversed.args,
  duration: '3'
};

export const CircleShowLabel = Template.bind({});
CircleShowLabel.args = {
  ...Circle.args,
  showLabel: true
};

export const CircleShowLabelRatio = Template.bind({});
CircleShowLabelRatio.args = {
  ...CircleShowLabel.args,
  labelType: 'ratio',
  endProgress: '1000'
};

export const CircleMd = Template.bind({});
CircleMd.args = {
  ...Circle.args,
  circleSize: 'md'
};

export const CircleMdReversed = Template.bind({});
CircleMdReversed.args = {
  ...CircleReversed.args,
  circleSize: 'md'
};

export const CircleMdDuration = Template.bind({});
CircleMdDuration.args = {
  ...CircleDuration.args,
  circleSize: 'md'
};

export const CircleMdDurationReversed = Template.bind({});
CircleMdDurationReversed.args = {
  ...CircleDurationReversed.args,
  circleSize: 'md'
};

export const CircleMdShowLabel = Template.bind({});
CircleMdShowLabel.args = {
  ...CircleShowLabel.args,
  circleSize: 'md'
};

export const CircleMdShowLabelRatio = Template.bind({});
CircleMdShowLabelRatio.args = {
  ...CircleShowLabelRatio.args,
  circleSize: 'md'
};

export const CircleLg = Template.bind({});
CircleLg.args = {
  ...Circle.args,
  circleSize: 'lg'
};

export const CircleLgReversed = Template.bind({});
CircleLgReversed.args = {
  ...CircleReversed.args,
  circleSize: 'lg'
};

export const CircleLgDuration = Template.bind({});
CircleLgDuration.args = {
  ...CircleDuration.args,
  circleSize: 'lg'
};

export const CircleLgDurationReversed = Template.bind({});
CircleLgDurationReversed.args = {
  ...CircleDurationReversed.args,
  circleSize: 'lg'
};

export const CircleLgShowLabel = Template.bind({});
CircleLgShowLabel.args = {
  ...CircleShowLabel.args,
  circleSize: 'lg'
};

export const CircleLgShowLabelRatio = Template.bind({});
CircleLgShowLabelRatio.args = {
  ...CircleShowLabelRatio.args,
  circleSize: 'lg'
};

export const CircleXl = Template.bind({});
CircleXl.args = {
  ...Circle.args,
  circleSize: 'xl'
};

export const CircleXlReversed = Template.bind({});
CircleXlReversed.args = {
  ...CircleReversed.args,
  circleSize: 'xl'
};

export const CircleXlDuration = Template.bind({});
CircleXlDuration.args = {
  ...CircleDuration.args,
  circleSize: 'xl'
};

export const CircleXlDurationReversed = Template.bind({});
CircleXlDurationReversed.args = {
  ...CircleDurationReversed.args,
  circleSize: 'xl'
};

export const CircleXlShowLabel = Template.bind({});
CircleXlShowLabel.args = {
  ...CircleShowLabel.args,
  circleSize: 'xl'
};

export const CircleXlShowLabelRatio = Template.bind({});
CircleXlShowLabelRatio.args = {
  ...CircleShowLabelRatio.args,
  circleSize: 'xl'
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

const updateProgress = (canvasElement, changeValue = 1, intervalMs = 10) => {
  const canvas = within(canvasElement);
  const progress = canvas.queryByTestId('progress') as any;

  const intervalId = setInterval(() => {
    if (progress.currentProgress === progress.endProgress) {
      clearInterval(intervalId);
    }

    progress.change(changeValue);
  }, intervalMs);
};

const incrementUnits = 10;
const decrementUnits = -10;

Default.play = async ({ canvasElement }) => {
  updateProgress(canvasElement);
};

DefaultReversed.play = async ({ canvasElement }) => {
  updateProgress(canvasElement, -1);
};

DefaultShowLabel.play = async ({ canvasElement }) => {
  updateProgress(canvasElement);
};

DefaultShowLabelRatio.play = async ({ canvasElement }) => {
  updateProgress(canvasElement, incrementUnits);
};

DefaultReversedShowLabel.play = async ({ canvasElement }) => {
  updateProgress(canvasElement, -1);
};

DefaultReversedShowLabelRatio.play = async ({ canvasElement }) => {
  updateProgress(canvasElement, -1);
};

Circle.play = async ({ canvasElement }) => {
  updateProgress(canvasElement);
};

CircleReversed.play = async ({ canvasElement }) => {
  updateProgress(canvasElement, -1);
};

CircleShowLabel.play = async ({ canvasElement }) => {
  updateProgress(canvasElement);
};

CircleShowLabelRatio.play = async ({ canvasElement }) => {
  updateProgress(canvasElement, incrementUnits);
};

CircleMd.play = async ({ canvasElement }) => {
  updateProgress(canvasElement);
};

CircleMdReversed.play = async ({ canvasElement }) => {
  updateProgress(canvasElement, -1);
};

CircleMdShowLabel.play = async ({ canvasElement }) => {
  updateProgress(canvasElement);
};

CircleMdShowLabelRatio.play = async ({ canvasElement }) => {
  updateProgress(canvasElement, incrementUnits);
};

CircleLg.play = async ({ canvasElement }) => {
  updateProgress(canvasElement);
};

CircleLgReversed.play = async ({ canvasElement }) => {
  updateProgress(canvasElement, -1);
};

CircleLgShowLabel.play = async ({ canvasElement }) => {
  updateProgress(canvasElement);
};

CircleLgShowLabelRatio.play = async ({ canvasElement }) => {
  updateProgress(canvasElement, incrementUnits);
};

CircleXl.play = async ({ canvasElement }) => {
  updateProgress(canvasElement);
};

CircleXlReversed.play = async ({ canvasElement }) => {
  updateProgress(canvasElement, -1);
};

CircleXlShowLabel.play = async ({ canvasElement }) => {
  updateProgress(canvasElement);
};

CircleXlShowLabelRatio.play = async ({ canvasElement }) => {
  updateProgress(canvasElement, incrementUnits);
};