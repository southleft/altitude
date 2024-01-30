import type { StoryObj } from '@storybook/react-webpack5';
import { SLProgress } from '../..';

export default {
  title: 'Atoms/Progress',
  component: SLProgress,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onProgressChange']
    },
  },
  argTypes: {
    isDarkContrast: {
      control: 'boolean'
    },
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

export const Default: StoryObj<typeof SLProgress> = {
  args: {},
  decorators: [
    (Story) => (
      <>
        <div className="c-progress">{Story()}</div>
      </>
    )
  ],
};

export const DefaultReversed: StoryObj<typeof SLProgress> = {
  args: {
    currentProgress: 100,
    endProgress: 0
  },
  decorators: [
    ...Default.decorators
  ]
};

export const DefaultDuration: StoryObj<typeof SLProgress> = {
  args: {
    duration: 3
  },
  decorators: [
    ...Default.decorators
  ]
};

export const DefaultDurationReversed: StoryObj<typeof SLProgress> = {
  args: {
    ...DefaultReversed.args,
    duration: 3
  },
  decorators: [
    ...Default.decorators
  ]
};

export const DefaultShowLabel: StoryObj<typeof SLProgress> = {
  args: {
    ...Default.args,
    showLabel: true
  },
  decorators: [
    ...Default.decorators
  ]
};

export const DefaultShowLabelRatio: StoryObj<typeof SLProgress> = {
  args: {
    ...DefaultShowLabel.args,
    labelType: 'ratio',
    endProgress: 1000
  },
  decorators: [
    ...Default.decorators
  ]
};

export const DefaultReversedShowLabel: StoryObj<typeof SLProgress> = {
  args: {
    ...DefaultReversed.args,
    showLabel: true
  },
  decorators: [
    ...Default.decorators
  ]
};

export const DefaultReversedShowLabelRatio: StoryObj<typeof SLProgress> = {
  args: {
    ...DefaultReversedShowLabel.args,
    labelType: 'ratio'
  },
  decorators: [
    ...Default.decorators
  ]
};

export const DefaultDurationShowLabel: StoryObj<typeof SLProgress> = {
  args: {
    ...DefaultDuration.args,
    showLabel: true
  },
  decorators: [
    ...Default.decorators
  ]
};

export const DefaultDurationReversedShowLabel: StoryObj<typeof SLProgress> = {
  args: {
    ...DefaultDurationReversed.args,
    showLabel: true
  },
  decorators: [
    ...Default.decorators
  ]
};

export const DefaultDarkContrast: StoryObj<typeof SLProgress> = {
  args: {
    isDarkContrast: true
  },
  decorators: [
    (Story) => (
      <>
        <div className="c-progress" style={{ background: '#8981E5', padding: '1rem' }}>{Story()}</div>
      </>
    )
  ]
};

export const DefaultDarkContrastShowLabel: StoryObj<typeof SLProgress> = {
  args: {
    ...DefaultDarkContrast.args,
    showLabel: true
  },
  decorators: [
    ...DefaultDarkContrast.decorators
  ]
};

export const Circle: StoryObj<typeof SLProgress> = {
  args: {
    isCircle: true
  },
  decorators: [
    ...Default.decorators
  ]
};

export const CircleReversed: StoryObj<typeof SLProgress> = {
  args: {
    ...Circle.args,
    currentProgress: 100,
    endProgress: 0
  },
  decorators: [
    ...Default.decorators
  ]
};

export const CircleDuration: StoryObj<typeof SLProgress> = {
  args: {
    ...Circle.args,
    duration: '3'
  },
  decorators: [
    ...Default.decorators
  ]
};

export const CircleDurationReversed: StoryObj<typeof SLProgress> = {
  args: {
    ...CircleDuration.args,
    currentProgress: 100,
    endProgress: 0
  },
  decorators: [
    ...Default.decorators
  ]
};

export const CircleShowLabel: StoryObj<typeof SLProgress> = {
  args: {
    ...Circle.args,
    showLabel: true
  },
  decorators: [
    ...Default.decorators
  ]
};

export const CircleShowLabelRatio: StoryObj<typeof SLProgress> = {
  args: {
    ...CircleShowLabel.args,
    labelType: 'ratio',
    endProgress: 1000
  },
  decorators: [
    ...Default.decorators
  ]
};

export const CircleDarkContrast: StoryObj<typeof SLProgress> = {
  args: {
    ...Circle.args,
    isDarkContrast: true
  },
  decorators: [
    ...DefaultDarkContrast.decorators
  ]
};

export const CircleMd: StoryObj<typeof SLProgress> = {
  args: {
    ...Circle.args,
    circleSize: 'md'
  },
  decorators: [
    ...Default.decorators
  ]
};

export const CircleMdReversed: StoryObj<typeof SLProgress> = {
  args: {
    ...CircleReversed.args,
    circleSize: 'md'
  },
  decorators: [
    ...Default.decorators
  ]
};

export const CircleMdDuration: StoryObj<typeof SLProgress> = {
  args: {
    ...CircleDuration.args,
    circleSize: 'md'
  },
  decorators: [
    ...Default.decorators
  ]
};

export const CircleMdDurationReversed: StoryObj<typeof SLProgress> = {
  args: {
    ...CircleDurationReversed.args,
    circleSize: 'md'
  },
  decorators: [
    ...Default.decorators
  ]
};

export const CircleMdShowLabel: StoryObj<typeof SLProgress> = {
  args: {
    ...CircleShowLabel.args,
    circleSize: 'md'
  },
  decorators: [
    ...Default.decorators
  ]
};

export const CircleMdShowLabelRatio: StoryObj<typeof SLProgress> = {
  args: {
    ...CircleShowLabelRatio.args,
    circleSize: 'md'
  },
  decorators: [
    ...Default.decorators
  ]
};

export const CircleMdDarkContrast: StoryObj<typeof SLProgress> = {
  args: {
    ...CircleDarkContrast.args,
    circleSize: 'md'
  },
  decorators: [
    ...DefaultDarkContrast.decorators
  ]
};

export const CircleLg: StoryObj<typeof SLProgress> = {
  args: {
    ...Circle.args,
    circleSize: 'lg'
  },
  decorators: [
    ...Default.decorators
  ]
};

export const CircleLgReversed: StoryObj<typeof SLProgress> = {
  args: {
    ...CircleReversed.args,
    circleSize: 'lg'
  },
  decorators: [
    ...Default.decorators
  ]
};

export const CircleLgDuration: StoryObj<typeof SLProgress> = {
  args: {
    ...CircleDuration.args,
    circleSize: 'lg'
  },
  decorators: [
    ...Default.decorators
  ]
};

export const CircleLgDurationReversed: StoryObj<typeof SLProgress> = {
  args: {
    ...CircleDurationReversed.args,
    circleSize: 'lg'
  },
  decorators: [
    ...Default.decorators
  ]
};

export const CircleLgShowLabel: StoryObj<typeof SLProgress> = {
  args: {
    ...CircleShowLabel.args,
    circleSize: 'lg'
  },
  decorators: [
    ...Default.decorators
  ]
};

export const CircleLgShowLabelRatio: StoryObj<typeof SLProgress> = {
  args: {
    ...CircleShowLabelRatio.args,
    circleSize: 'lg'
  },
  decorators: [
    ...Default.decorators
  ]
};

export const CircleLgDarkContrast: StoryObj<typeof SLProgress> = {
  args: {
    ...CircleDarkContrast.args,
    circleSize: 'lg'
  },
  decorators: [
    ...DefaultDarkContrast.decorators
  ]
};

export const CircleXl: StoryObj<typeof SLProgress> = {
  args: {
    ...Circle.args,
    circleSize: 'xl'
  },
  decorators: [
    ...Default.decorators
  ]
};

export const CircleXlReversed: StoryObj<typeof SLProgress> = {
  args: {
    ...CircleReversed.args,
    circleSize: 'xl'
  },
  decorators: [
    ...Default.decorators
  ]
};

export const CircleXlDuration: StoryObj<typeof SLProgress> = {
  args: {
    ...CircleDuration.args,
    circleSize: 'xl'
  },
  decorators: [
    ...Default.decorators
  ]
};

export const CircleXlDurationReversed: StoryObj<typeof SLProgress> = {
  args: {
    ...CircleDurationReversed.args,
    circleSize: 'xl'
  },
  decorators: [
    ...Default.decorators
  ]
};

export const CircleXlShowLabel: StoryObj<typeof SLProgress> = {
  args: {
    ...CircleShowLabel.args,
    circleSize: 'xl'
  },
  decorators: [
    ...Default.decorators
  ]
};

export const CircleXlShowLabelRatio: StoryObj<typeof SLProgress> = {
  args: {
    ...CircleShowLabelRatio.args,
    circleSize: 'xl'
  },
  decorators: [
    ...Default.decorators
  ]
};

export const CircleXlDarkContrast: StoryObj<typeof SLProgress> = {
  args: {
    ...CircleDarkContrast.args,
    circleSize: 'xl'
  },
  decorators: [
    ...DefaultDarkContrast.decorators
  ]
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

const incrementUnits = 10;
const decrementUnits = -10;

const updateProgress = (changeValue = 1, intervalMs = 10) => {
  const progress = document.querySelector<any>('.c-progress').querySelector('*');

  const intervalId = setInterval(() => {
    if (progress.currentProgress === progress.endProgress) {
      clearInterval(intervalId);
    }

    progress.change(changeValue);
  }, intervalMs);
};

Default.play = async () => {
  updateProgress();
};

DefaultReversed.play = async () => {
  updateProgress(-1);
};

DefaultShowLabel.play = async () => {
  updateProgress();
};

DefaultShowLabelRatio.play = async () => {
  updateProgress(incrementUnits);
};

DefaultReversedShowLabel.play = async () => {
  updateProgress(-1);
};

DefaultReversedShowLabelRatio.play = async () => {
  updateProgress(decrementUnits);
};

DefaultDarkContrast.play = async () => {
  updateProgress();
};

DefaultDarkContrastShowLabel.play = async () => {
  updateProgress();
};

Circle.play = async () => {
  updateProgress();
};

CircleReversed.play = async () => {
  updateProgress(-1);
};

CircleShowLabel.play = async () => {
  updateProgress();
};

CircleShowLabelRatio.play = async () => {
  updateProgress(incrementUnits);
};

CircleDarkContrast.play = async () => {
  updateProgress();
};

CircleMd.play = async () => {
  updateProgress();
};

CircleMdReversed.play = async () => {
  updateProgress(-1);
};

CircleMdShowLabel.play = async () => {
  updateProgress();
};

CircleMdShowLabelRatio.play = async () => {
  updateProgress(incrementUnits);
};

CircleMdDarkContrast.play = async () => {
  updateProgress();
};

CircleLg.play = async () => {
  updateProgress();
};

CircleLgReversed.play = async () => {
  updateProgress(-1);
};

CircleLgShowLabel.play = async () => {
  updateProgress();
};

CircleLgShowLabelRatio.play = async () => {
  updateProgress(incrementUnits);
};

CircleLgDarkContrast.play = async () => {
  updateProgress();
};

CircleXl.play = async () => {
  updateProgress();
};

CircleXlReversed.play = async () => {
  updateProgress(-1);
};

CircleXlShowLabel.play = async () => {
  updateProgress();
};

CircleXlShowLabelRatio.play = async () => {
  updateProgress(incrementUnits);
};

CircleXlDarkContrast.play = async () => {
  updateProgress();
};
