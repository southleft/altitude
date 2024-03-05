import type { StoryObj } from '@storybook/react-webpack5';
import { ALDropdownPanel, ALList, ALListItem, ALIconSuccess, ALSearch } from '../..';

export default {
  title: 'Atoms/Dropdown Panel',
  component: ALDropdownPanel,
  parameters: { status: { type: 'beta' } },
  args: {
    children: (
      <>
        <ALList>
          <ALListItem>List item</ALListItem>
          <ALListItem>List item</ALListItem>
          <ALListItem>List item</ALListItem>
          <ALListItem>List item</ALListItem>
          <ALListItem>List item</ALListItem>
          <ALListItem>List item</ALListItem>
          <ALListItem>List item</ALListItem>
          <ALListItem>List item</ALListItem>
          <ALListItem>List item</ALListItem>
          <ALListItem>List item</ALListItem>
      </ALList>
      </>
    )
  },
};

export const Default: StoryObj<typeof ALDropdownPanel> = { args: {} };

export const WithScroll: StoryObj<typeof ALDropdownPanel> = {
  args: {
    hasScroll: true
  }
};

export const WithIconList: StoryObj<typeof ALDropdownPanel> = {
  args: {
    children: (
      <>
        <ALList>
          <ALListItem><ALIconSuccess slot="before"></ALIconSuccess>
            List item</ALListItem>
          <ALListItem><ALIconSuccess slot="before"></ALIconSuccess>
            List item</ALListItem>
          <ALListItem><ALIconSuccess slot="before"></ALIconSuccess>
            List item</ALListItem>
          <ALListItem><ALIconSuccess slot="before"></ALIconSuccess>
            List item</ALListItem>
          <ALListItem><ALIconSuccess slot="before"></ALIconSuccess>
            List item</ALListItem>
          <ALListItem><ALIconSuccess slot="before"></ALIconSuccess>
            List item</ALListItem>
          <ALListItem><ALIconSuccess slot="before"></ALIconSuccess>
            List item</ALListItem>
          <ALListItem><ALIconSuccess slot="before"></ALIconSuccess>
            List item</ALListItem>
          <ALListItem><ALIconSuccess slot="before"></ALIconSuccess>
            List item</ALListItem>
          <ALListItem><ALIconSuccess slot="before"></ALIconSuccess>
            List item</ALListItem>
      </ALList>
      </>
    )
  }
};

export const WithSearch: StoryObj<typeof ALDropdownPanel> = {
  args: {
    hasHeader: true,
    hasScroll: true,
    children: (
      <>
        <ALSearch slot="header" value={''} isEmpty={true}>
          {' '}
        </ALSearch>
        <ALList>
          <ALListItem>List item</ALListItem>
          <ALListItem>List item</ALListItem>
          <ALListItem>List item</ALListItem>
          <ALListItem>List item</ALListItem>
          <ALListItem>List item</ALListItem>
          <ALListItem>List item</ALListItem>
          <ALListItem>List item</ALListItem>
          <ALListItem>List item</ALListItem>
          <ALListItem>List item</ALListItem>
          <ALListItem>List item</ALListItem>
      </ALList>
      </>
    )
  }
};