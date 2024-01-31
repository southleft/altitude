import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { SLGrid, SLGridItem} from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Organisms/Grid',
  component: SLGrid,
  subcomponents: { SLGridItem },
  parameters: { status: { type: 'beta' } },
  args: {
    children: (
      <>
        <SLGridItem>
          <Fpo>Grid Item 1</Fpo>
        </SLGridItem>
        <SLGridItem>
          <Fpo>Grid Item 2</Fpo>
        </SLGridItem>
        <SLGridItem>
          <Fpo>Grid Item 3</Fpo>
        </SLGridItem>
        <SLGridItem>
          <Fpo>Grid Item 4</Fpo>
        </SLGridItem>
        <SLGridItem>
          <Fpo>Grid Item 5</Fpo>
        </SLGridItem>
        <SLGridItem>
          <Fpo>Grid Item 6</Fpo>
        </SLGridItem>
        <SLGridItem>
          <Fpo>Grid Item 7</Fpo>
        </SLGridItem>
        <SLGridItem>
          <Fpo>Grid Item 8</Fpo>
        </SLGridItem>
      </>
    )
  }
};

export const Default: StoryObj<typeof SLGrid> = { args: {} };

export const SideBySide: StoryObj<typeof SLGrid> = {
  args: {
    variant: 'side-by-side'
  }
};

export const TwoUp: StoryObj<typeof SLGrid> = {
  args: {
    variant: '2up'
  }
};

export const TwoUpBreakFaster: StoryObj<typeof SLGrid> = {
  args: {
    variant: '2up',
    break: 'faster'
  }
};

export const TwoUpBreakSlower: StoryObj<typeof SLGrid> = {
  args: {
    variant: '2up',
    break: 'slower'
  }
};

export const ThreeUp: StoryObj<typeof SLGrid> = {
  args: {
    variant: '3up'
  }
};

export const OneToThreeUp: StoryObj<typeof SLGrid> = {
  args: {
    variant: '1-3up'
  }
};

export const TwoToThreeUp: StoryObj<typeof SLGrid> = {
  args: {
    variant: '2-3up'
  }
};

export const OneToThreeUpBreakFaster: StoryObj<typeof SLGrid> = {
  args: {
    variant: '1-3up',
    break: 'faster'
  }
};

export const OneToThreeUpBreakSlower: StoryObj<typeof SLGrid> = {
  args: {
    variant: '1-3up',
    break: 'slower'
  }
};

export const OneToFourUp: StoryObj<typeof SLGrid> = {
  args: {
    variant: '1-4up'
  }
};

export const OneToTwoToFourUp: StoryObj<typeof SLGrid> = {
  args: {
    variant: '1-2-4up'
  }
};

export const TwoToFourUp: StoryObj<typeof SLGrid> = {
  args: {
    variant: '2-4up'
  }
};

export const FourUp: StoryObj<typeof SLGrid> = {
  args: {
    variant: '4up'
  }
};

export const TwoToFourToFiveUp: StoryObj<typeof SLGrid> = {
  args: {
    variant: '2-4-5up'
  }
};

export const TwoToThreeToFourToFiveUp: StoryObj<typeof SLGrid> = {
  args: {
    variant: '2-3-4-5up'
  }
};

export const FiveUp: StoryObj<typeof SLGrid> = {
  args: {
    variant: '5up'
  }
};

export const GapNoneFourUp: StoryObj<typeof SLGrid> = {
  args: {
    variant: '4up',
    gap: 'none'
  }
};

export const GapSmallFourUp: StoryObj<typeof SLGrid> = {
  args: {
    variant: '4up',
    gap: 'sm'
  }
};

export const GapLargeFourUp: StoryObj<typeof SLGrid> = {
  args: {
    variant: '4up',
    gap: 'lg'
  }
};

export const TwoTo4to6Up: StoryObj<typeof SLGrid> = {
  args: {
    variant: '2-4-6up'
  }
};
