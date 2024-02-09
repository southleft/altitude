import type { StoryObj } from '@storybook/react-webpack5';
import { SLDropdownPanel, SLList, SLListItem, SLIconCheck, SLSearch } from '../..';

export default {
  title: 'Atoms/Dropdown Panel',
  component: SLDropdownPanel,
  parameters: { status: { type: 'beta' } },
  args: {
    children: (
      <>
        <SLList>
          <SLListItem>List item</SLListItem>
          <SLListItem>List item</SLListItem>
          <SLListItem>List item</SLListItem>
          <SLListItem>List item</SLListItem>
          <SLListItem>List item</SLListItem>
          <SLListItem>List item</SLListItem>
          <SLListItem>List item</SLListItem>
          <SLListItem>List item</SLListItem>
          <SLListItem>List item</SLListItem>
          <SLListItem>List item</SLListItem>
      </SLList>
      </>
    )
  },
};

export const Default: StoryObj<typeof SLDropdownPanel> = { args: {} };

export const WithScroll: StoryObj<typeof SLDropdownPanel> = {
  args: {
    hasScroll: true
  }
};

export const WithIconList: StoryObj<typeof SLDropdownPanel> = {
  args: {
    children: (
      <>
        <SLList>
          <SLListItem><SLIconCheck slot="before"></SLIconCheck>
            List item</SLListItem>
          <SLListItem><SLIconCheck slot="before"></SLIconCheck>
            List item</SLListItem>
          <SLListItem><SLIconCheck slot="before"></SLIconCheck>
            List item</SLListItem>
          <SLListItem><SLIconCheck slot="before"></SLIconCheck>
            List item</SLListItem>
          <SLListItem><SLIconCheck slot="before"></SLIconCheck>
            List item</SLListItem>
          <SLListItem><SLIconCheck slot="before"></SLIconCheck>
            List item</SLListItem>
          <SLListItem><SLIconCheck slot="before"></SLIconCheck>
            List item</SLListItem>
          <SLListItem><SLIconCheck slot="before"></SLIconCheck>
            List item</SLListItem>
          <SLListItem><SLIconCheck slot="before"></SLIconCheck>
            List item</SLListItem>
          <SLListItem><SLIconCheck slot="before"></SLIconCheck>
            List item</SLListItem>
      </SLList>
      </>
    )
  }
};

export const WithSearch: StoryObj<typeof SLDropdownPanel> = {
  args: {
    hasHeader: true,
    hasScroll: true,
    children: (
      <>
        <SLSearch slot="header" value={''} isEmpty={true}>
          {' '}
        </SLSearch>
        <SLList>
          <SLListItem>List item</SLListItem>
          <SLListItem>List item</SLListItem>
          <SLListItem>List item</SLListItem>
          <SLListItem>List item</SLListItem>
          <SLListItem>List item</SLListItem>
          <SLListItem>List item</SLListItem>
          <SLListItem>List item</SLListItem>
          <SLListItem>List item</SLListItem>
          <SLListItem>List item</SLListItem>
          <SLListItem>List item</SLListItem>
      </SLList>
      </>
    )
  }
};