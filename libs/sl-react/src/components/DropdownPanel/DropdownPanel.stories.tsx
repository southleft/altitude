import type { StoryObj } from '@storybook/react-webpack5';
import { SLDropdownPanel, SLList, SLListItem, SLIconDone, SLSearchForm } from '../..';

export default {
  title: 'Boilerplate/Dropdown Panel',
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
          <SLListItem><SLIconDone slot="before"></SLIconDone>
            List item</SLListItem>
          <SLListItem><SLIconDone slot="before"></SLIconDone>
            List item</SLListItem>
          <SLListItem><SLIconDone slot="before"></SLIconDone>
            List item</SLListItem>
          <SLListItem><SLIconDone slot="before"></SLIconDone>
            List item</SLListItem>
          <SLListItem><SLIconDone slot="before"></SLIconDone>
            List item</SLListItem>
          <SLListItem><SLIconDone slot="before"></SLIconDone>
            List item</SLListItem>
          <SLListItem><SLIconDone slot="before"></SLIconDone>
            List item</SLListItem>
          <SLListItem><SLIconDone slot="before"></SLIconDone>
            List item</SLListItem>
          <SLListItem><SLIconDone slot="before"></SLIconDone>
            List item</SLListItem>
          <SLListItem><SLIconDone slot="before"></SLIconDone>
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
        <SLSearchForm slot="header" value={''} isEmpty={true}>
          {' '}
        </SLSearchForm>
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