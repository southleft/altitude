import type { StoryObj } from '@storybook/react-webpack5';
import { SLList, SLListItem, SLDropdownPanel } from '../..';

export default {
  title: 'Molecules/List',
  component: SLList,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['select']
    }
  },
  args: {
    children: (
      <>
        <SLListItem>List Item</SLListItem>
        <SLListItem>List Item</SLListItem>
        <SLListItem>List Item</SLListItem>
        <SLListItem>List Item</SLListItem>
        <SLListItem>List Item</SLListItem>
        <SLListItem>List Item</SLListItem>
        <SLListItem>List Item</SLListItem>
        <SLListItem>List Item</SLListItem>
        <SLListItem isError={true}>List Item</SLListItem>
        <SLListItem isDisabled={true}>List Item</SLListItem>
      </>
    )
  },
};

export const Default: StoryObj<typeof SLList> = { args: {} };

export const WithLinks: StoryObj<typeof SLList> = {
  args: {
    children: (
      <>
        <SLListItem href="#">List Item</SLListItem>
        <SLListItem href="#">List Item</SLListItem>
        <SLListItem href="#">List Item</SLListItem>
        <SLListItem href="#">List Item</SLListItem>
        <SLListItem href="#">List Item</SLListItem>
        <SLListItem href="#">List Item</SLListItem>
        <SLListItem href="#">List Item</SLListItem>
        <SLListItem href="#">List Item</SLListItem>
        <SLListItem href="#" isError={true}>List Item</SLListItem>
        <SLListItem href="#" isDisabled={true}>List Item</SLListItem>
      </>
    )
  }
};

export const WithStatic: StoryObj<typeof SLList> = {
  args: {
    children: (
      <>
        <SLListItem variant="static">List Item</SLListItem>
        <SLListItem variant="static">List Item</SLListItem>
        <SLListItem variant="static">List Item</SLListItem>
        <SLListItem variant="static">List Item</SLListItem>
        <SLListItem variant="static">List Item</SLListItem>
        <SLListItem variant="static">List Item</SLListItem>
        <SLListItem variant="static">List Item</SLListItem>
        <SLListItem variant="static">List Item</SLListItem>
        <SLListItem variant="static" isError={true}>List Item</SLListItem>
        <SLListItem variant="static" isDisabled={true}>List Item</SLListItem>
      </>
    )
  }
};

export const WithFlyoutMenu: StoryObj<typeof SLList> = {
  args: {
    children: (
      <>
        <SLListItem behavior="flyout">
          List Item
          <SLList slot="items">
            <SLListItem behavior="flyout">
              List Item
              <SLList slot="items">
                <SLListItem behavior="flyout">
                  List Item
                  <SLList slot="items">
                    <SLListItem behavior="flyout">
                      List Item
                      <SLList slot="items">
                        <SLListItem>List Item</SLListItem>
                        <SLListItem>List Item</SLListItem>
                        <SLListItem>List Item</SLListItem>
                        <SLListItem>List Item</SLListItem>
                      </SLList>
                    </SLListItem>
                    <SLListItem>List Item</SLListItem>
                    <SLListItem>List Item</SLListItem>
                    <SLListItem>List Item</SLListItem>
                  </SLList>
                </SLListItem>
                <SLListItem>List Item</SLListItem>
                <SLListItem>List Item</SLListItem>
                <SLListItem>List Item</SLListItem>
              </SLList>
            </SLListItem>
            <SLListItem>List Item</SLListItem>
            <SLListItem>List Item</SLListItem>
            <SLListItem>List Item</SLListItem>
          </SLList>
        </SLListItem>
        <SLListItem>List Item</SLListItem>
        <SLListItem isError={true}>List Item</SLListItem>
        <SLListItem isDisabled={true}>List Item</SLListItem>
      </>
    )
  },
  decorators: [
    (Story) => (
      <SLDropdownPanel style={{display: 'block', maxWidth: '10rem'}}>
        {Story()}
      </SLDropdownPanel>
    )
  ]
};

export const WithExpandableList: StoryObj<typeof SLList> = {
  args: {
    children: (
      <>
        <SLListItem>
          List Item
          <SLList slot="items">
            <SLListItem>
              List Item
              <SLList slot="items">
                <SLListItem>
                  List Item
                  <SLList slot="items">
                    <SLListItem>
                      List Item
                      <SLList slot="items">
                        <SLListItem>
                          List Item
                          <SLList slot="items">
                            <SLListItem>
                              List Item
                              <SLList slot="items">
                                <SLListItem>
                                  List Item
                                  <SLList slot="items">
                                    <SLListItem>List Item</SLListItem>
                                    <SLListItem>List Item</SLListItem>
                                    <SLListItem>List Item</SLListItem>
                                    <SLListItem>List Item</SLListItem>
                                  </SLList>
                                </SLListItem>
                                <SLListItem>List Item</SLListItem>
                                <SLListItem>List Item</SLListItem>
                                <SLListItem>List Item</SLListItem>
                              </SLList>
                            </SLListItem>
                            <SLListItem>List Item</SLListItem>
                            <SLListItem>List Item</SLListItem>
                            <SLListItem>List Item</SLListItem>
                          </SLList>
                        </SLListItem>
                        <SLListItem>List Item</SLListItem>
                        <SLListItem>List Item</SLListItem>
                        <SLListItem>List Item</SLListItem>
                      </SLList>
                    </SLListItem>
                    <SLListItem>List Item</SLListItem>
                    <SLListItem>List Item</SLListItem>
                    <SLListItem>List Item</SLListItem>
                  </SLList>
                </SLListItem>
                <SLListItem>List Item</SLListItem>
                <SLListItem>List Item</SLListItem>
                <SLListItem>List Item</SLListItem>
              </SLList>
            </SLListItem>
            <SLListItem>List Item</SLListItem>
            <SLListItem>List Item</SLListItem>
            <SLListItem>List Item</SLListItem>
          </SLList>
        </SLListItem>
        <SLListItem>List Item</SLListItem>
        <SLListItem isError={true}>List Item</SLListItem>
        <SLListItem isDisabled={true}>List Item</SLListItem>
      </>
    )
  },
};

export const Horizontal: StoryObj<typeof SLList> = {
  args: {
    orientation: 'horizontal'
  }
};

export const HorizontalOverflow: StoryObj<typeof SLList> = {
  args: {
    orientation: 'horizontal',
    behavior: 'overflow',
  }
};