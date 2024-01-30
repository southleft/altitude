import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { SLContextualMenu, SLIconList, SLButton, SLList, SLListItem } from '../..';

export default {
  title: 'Boilerplate/Contextual Menu',
  component: SLContextualMenu,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onContextualMenuOpen', 'onContextualMenuClose']
    }
  },
  args: {
    children: (
      <>
        <SLButton slot="trigger" hideText={true}>
          Menu<SLIconList slot="after"></SLIconList>
        </SLButton>
        <SLList>
          <SLListItem>List Item 1</SLListItem>
          <SLListItem>List Item 2</SLListItem>
          <SLListItem>List Item 3</SLListItem>
          <SLListItem>List Item 4</SLListItem>
          <SLListItem>List Item 5</SLListItem>
          <SLListItem>List Item 6</SLListItem>
        </SLList>
      </>
    )
  }
};

function sampleOnClickFunction() {
  console.log('Hello There!');
}

export const Default: StoryObj<typeof SLContextualMenu> = { args: {} };

export const PositionBottomCenter: StoryObj<typeof SLContextualMenu> = {
  args: {
    position: 'bottom-center'
  }
};

export const PositionBottomRight: StoryObj<typeof SLContextualMenu> = {
  args: {
    position: 'bottom-right'
  }
};

export const PositionTop: StoryObj<typeof SLContextualMenu> = {
  args: {
    position: 'top'
  }
};

export const PositionTopCenter: StoryObj<typeof SLContextualMenu> = {
  args: {
    position: 'top-center'
  }
};

export const PositionTopRight: StoryObj<typeof SLContextualMenu> = {
  args: {
    position: 'top-right'
  }
};

export const PositionLeft: StoryObj<typeof SLContextualMenu> = {
  args: {
    position: 'left'
  }
};

export const PositionRight: StoryObj<typeof SLContextualMenu> = {
  args: {
    position: 'right'
  }
};
