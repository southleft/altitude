import type { StoryObj } from '@storybook/react-webpack5';
import { ALList, ALListItem, ALDropdownPanel } from '../..';

export default {
  title: 'Molecules/List',
  component: ALList,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['select']
    }
  },
  args: {
    children: (
      <>
        <ALListItem>List Item</ALListItem>
        <ALListItem>List Item</ALListItem>
        <ALListItem>List Item</ALListItem>
        <ALListItem>List Item</ALListItem>
        <ALListItem>List Item</ALListItem>
        <ALListItem>List Item</ALListItem>
        <ALListItem>List Item</ALListItem>
        <ALListItem>List Item</ALListItem>
        <ALListItem isError={true}>List Item</ALListItem>
        <ALListItem isDisabled={true}>List Item</ALListItem>
      </>
    )
  },
};

export const Default: StoryObj<typeof ALList> = { args: {} };

export const WithLinks: StoryObj<typeof ALList> = {
  args: {
    children: (
      <>
        <ALListItem href="#">List Item</ALListItem>
        <ALListItem href="#">List Item</ALListItem>
        <ALListItem href="#">List Item</ALListItem>
        <ALListItem href="#">List Item</ALListItem>
        <ALListItem href="#">List Item</ALListItem>
        <ALListItem href="#">List Item</ALListItem>
        <ALListItem href="#">List Item</ALListItem>
        <ALListItem href="#">List Item</ALListItem>
        <ALListItem href="#" isError={true}>List Item</ALListItem>
        <ALListItem href="#" isDisabled={true}>List Item</ALListItem>
      </>
    )
  }
};

export const WithStatic: StoryObj<typeof ALList> = {
  args: {
    children: (
      <>
        <ALListItem variant="static">List Item</ALListItem>
        <ALListItem variant="static">List Item</ALListItem>
        <ALListItem variant="static">List Item</ALListItem>
        <ALListItem variant="static">List Item</ALListItem>
        <ALListItem variant="static">List Item</ALListItem>
        <ALListItem variant="static">List Item</ALListItem>
        <ALListItem variant="static">List Item</ALListItem>
        <ALListItem variant="static">List Item</ALListItem>
        <ALListItem variant="static" isError={true}>List Item</ALListItem>
        <ALListItem variant="static" isDisabled={true}>List Item</ALListItem>
      </>
    )
  }
};

export const WithFlyoutMenu: StoryObj<typeof ALList> = {
  args: {
    children: (
      <>
        <ALListItem behavior="flyout">
          List Item
          <ALList slot="items">
            <ALListItem behavior="flyout">
              List Item
              <ALList slot="items">
                <ALListItem behavior="flyout">
                  List Item
                  <ALList slot="items">
                    <ALListItem behavior="flyout">
                      List Item
                      <ALList slot="items">
                        <ALListItem>List Item</ALListItem>
                        <ALListItem>List Item</ALListItem>
                        <ALListItem>List Item</ALListItem>
                        <ALListItem>List Item</ALListItem>
                      </ALList>
                    </ALListItem>
                    <ALListItem>List Item</ALListItem>
                    <ALListItem>List Item</ALListItem>
                    <ALListItem>List Item</ALListItem>
                  </ALList>
                </ALListItem>
                <ALListItem>List Item</ALListItem>
                <ALListItem>List Item</ALListItem>
                <ALListItem>List Item</ALListItem>
              </ALList>
            </ALListItem>
            <ALListItem>List Item</ALListItem>
            <ALListItem>List Item</ALListItem>
            <ALListItem>List Item</ALListItem>
          </ALList>
        </ALListItem>
        <ALListItem>List Item</ALListItem>
        <ALListItem isError={true}>List Item</ALListItem>
        <ALListItem isDisabled={true}>List Item</ALListItem>
      </>
    )
  },
  decorators: [
    (Story) => (
      <ALDropdownPanel style={{display: 'block', maxWidth: '10rem'}}>
        {Story()}
      </ALDropdownPanel>
    )
  ]
};

export const WithExpandableList: StoryObj<typeof ALList> = {
  args: {
    children: (
      <>
        <ALListItem>
          List Item
          <ALList slot="items">
            <ALListItem>
              List Item
              <ALList slot="items">
                <ALListItem>
                  List Item
                  <ALList slot="items">
                    <ALListItem>
                      List Item
                      <ALList slot="items">
                        <ALListItem>
                          List Item
                          <ALList slot="items">
                            <ALListItem>
                              List Item
                              <ALList slot="items">
                                <ALListItem>
                                  List Item
                                  <ALList slot="items">
                                    <ALListItem>List Item</ALListItem>
                                    <ALListItem>List Item</ALListItem>
                                    <ALListItem>List Item</ALListItem>
                                    <ALListItem>List Item</ALListItem>
                                  </ALList>
                                </ALListItem>
                                <ALListItem>List Item</ALListItem>
                                <ALListItem>List Item</ALListItem>
                                <ALListItem>List Item</ALListItem>
                              </ALList>
                            </ALListItem>
                            <ALListItem>List Item</ALListItem>
                            <ALListItem>List Item</ALListItem>
                            <ALListItem>List Item</ALListItem>
                          </ALList>
                        </ALListItem>
                        <ALListItem>List Item</ALListItem>
                        <ALListItem>List Item</ALListItem>
                        <ALListItem>List Item</ALListItem>
                      </ALList>
                    </ALListItem>
                    <ALListItem>List Item</ALListItem>
                    <ALListItem>List Item</ALListItem>
                    <ALListItem>List Item</ALListItem>
                  </ALList>
                </ALListItem>
                <ALListItem>List Item</ALListItem>
                <ALListItem>List Item</ALListItem>
                <ALListItem>List Item</ALListItem>
              </ALList>
            </ALListItem>
            <ALListItem>List Item</ALListItem>
            <ALListItem>List Item</ALListItem>
            <ALListItem>List Item</ALListItem>
          </ALList>
        </ALListItem>
        <ALListItem>List Item</ALListItem>
        <ALListItem isError={true}>List Item</ALListItem>
        <ALListItem isDisabled={true}>List Item</ALListItem>
      </>
    )
  },
};

export const Horizontal: StoryObj<typeof ALList> = {
  args: {
    orientation: 'horizontal'
  }
};

export const HorizontalOverflow: StoryObj<typeof ALList> = {
  args: {
    orientation: 'horizontal',
    behavior: 'overflow',
  }
};