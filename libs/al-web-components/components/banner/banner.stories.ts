import { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './banner';
import '../button/button';

export default {
  title: 'Components/Banner',
  component: 'al-banner',
  parameters: {
    docs: {
      description: {
        component: 'The banner component is used to display important information to users in a prominent way. It supports multiple variants for different message types and can be expanded/collapsed to show additional content.'
      }
    }
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['info', 'success', 'warning', 'danger'],
      description: 'The visual variant of the banner',
      table: {
        defaultValue: { summary: 'info' }
      }
    },
    title: {
      control: { type: 'text' },
      description: 'The title text of the banner',
      table: {
        defaultValue: { summary: 'Banner Title' }
      }
    },
    description: {
      control: { type: 'text' },
      description: 'The description text of the banner'
    },
    isExpanded: {
      control: { type: 'boolean' },
      description: 'Whether the banner is expanded or collapsed',
      table: {
        defaultValue: { summary: false }
      }
    },
    isCollapsible: {
      control: { type: 'boolean' },
      description: 'Whether the banner can be expanded/collapsed',
      table: {
        defaultValue: { summary: true }
      }
    },
    showDescription: {
      control: { type: 'boolean' },
      description: 'Whether to show the description when expanded',
      table: {
        defaultValue: { summary: true }
      }
    }
  },
  args: {
    title: 'Banner Title',
    variant: 'info',
    isExpanded: false,
    isCollapsible: true,
    showDescription: true
  }
} as Meta;

type Story = StoryObj;

/**
 * Default banner with info variant
 */
export const Default: Story = {
  render: (args) => html`
    <al-banner
      variant="${args.variant}"
      title="${args.title}"
      description="${args.description}"
      ?isExpanded="${args.isExpanded}"
      ?isCollapsible="${args.isCollapsible}"
      ?showDescription="${args.showDescription}"
    ></al-banner>
  `
};

/**
 * Info banner (default variant)
 */
export const Info: Story = {
  args: {
    variant: 'info',
    title: 'Information',
    description: 'This is an informational message to help users understand something.'
  },
  render: (args) => html`
    <al-banner
      variant="${args.variant}"
      title="${args.title}"
      description="${args.description}"
      ?isExpanded="${args.isExpanded}"
      ?isCollapsible="${args.isCollapsible}"
      ?showDescription="${args.showDescription}"
    ></al-banner>
  `
};

/**
 * Success banner
 */
export const Success: Story = {
  args: {
    variant: 'success',
    title: 'Success',
    description: 'Your changes have been saved successfully.'
  },
  render: (args) => html`
    <al-banner
      variant="${args.variant}"
      title="${args.title}"
      description="${args.description}"
      ?isExpanded="${args.isExpanded}"
      ?isCollapsible="${args.isCollapsible}"
      ?showDescription="${args.showDescription}"
    ></al-banner>
  `
};

/**
 * Warning banner
 */
export const Warning: Story = {
  args: {
    variant: 'warning',
    title: 'Warning',
    description: 'Please review your information before proceeding.'
  },
  render: (args) => html`
    <al-banner
      variant="${args.variant}"
      title="${args.title}"
      description="${args.description}"
      ?isExpanded="${args.isExpanded}"
      ?isCollapsible="${args.isCollapsible}"
      ?showDescription="${args.showDescription}"
    ></al-banner>
  `
};

/**
 * Danger banner
 */
export const Danger: Story = {
  args: {
    variant: 'danger',
    title: 'Error',
    description: 'There was an error processing your request. Please try again.'
  },
  render: (args) => html`
    <al-banner
      variant="${args.variant}"
      title="${args.title}"
      description="${args.description}"
      ?isExpanded="${args.isExpanded}"
      ?isCollapsible="${args.isCollapsible}"
      ?showDescription="${args.showDescription}"
    ></al-banner>
  `
};

/**
 * Expanded banner with description
 */
export const Expanded: Story = {
  args: {
    variant: 'info',
    title: 'Expanded Banner',
    description: 'This banner is expanded by default, showing the full description text. Users can collapse it using the toggle button.',
    isExpanded: true
  },
  render: (args) => html`
    <al-banner
      variant="${args.variant}"
      title="${args.title}"
      description="${args.description}"
      ?isExpanded="${args.isExpanded}"
      ?isCollapsible="${args.isCollapsible}"
      ?showDescription="${args.showDescription}"
    ></al-banner>
  `
};

/**
 * Banner with actions
 */
export const WithActions: Story = {
  args: {
    variant: 'warning',
    title: 'Action Required',
    description: 'Your session is about to expire. Please save your work.',
    isExpanded: true
  },
  render: (args) => html`
    <al-banner
      variant="${args.variant}"
      title="${args.title}"
      description="${args.description}"
      ?isExpanded="${args.isExpanded}"
      ?isCollapsible="${args.isCollapsible}"
      ?showDescription="${args.showDescription}"
    >
      <al-button slot="actions" variant="secondary" size="sm">Save Work</al-button>
      <al-button slot="actions" variant="bare" size="sm">Dismiss</al-button>
    </al-banner>
  `
};

/**
 * Non-collapsible banner
 */
export const NonCollapsible: Story = {
  args: {
    variant: 'danger',
    title: 'Critical Error',
    description: 'System maintenance in progress. Some features may be unavailable.',
    isExpanded: true,
    isCollapsible: false
  },
  render: (args) => html`
    <al-banner
      variant="${args.variant}"
      title="${args.title}"
      description="${args.description}"
      ?isExpanded="${args.isExpanded}"
      ?isCollapsible="${args.isCollapsible}"
      ?showDescription="${args.showDescription}"
    ></al-banner>
  `
};

/**
 * Banner with slot content
 */
export const WithSlotContent: Story = {
  args: {
    variant: 'info',
    title: 'Custom Content',
    isExpanded: true
  },
  render: (args) => html`
    <al-banner
      variant="${args.variant}"
      title="${args.title}"
      ?isExpanded="${args.isExpanded}"
      ?isCollapsible="${args.isCollapsible}"
      ?showDescription="${args.showDescription}"
    >
      <div>
        <p>This is custom content using the default slot.</p>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
          <li>Item 3</li>
        </ul>
      </div>
    </al-banner>
  `
};

/**
 * All variants showcase
 */
export const AllVariants: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <al-banner
        variant="info"
        title="Info Banner"
        description="This is an informational message."
      ></al-banner>
      <al-banner
        variant="success"
        title="Success Banner"
        description="Operation completed successfully."
      ></al-banner>
      <al-banner
        variant="warning"
        title="Warning Banner"
        description="Please proceed with caution."
      ></al-banner>
      <al-banner
        variant="danger"
        title="Danger Banner"
        description="An error has occurred."
      ></al-banner>
    </div>
  `
};

/**
 * All variants expanded
 */
export const AllVariantsExpanded: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <al-banner
        variant="info"
        title="Info Banner"
        description="This is an informational message with more details when expanded."
        isExpanded
      ></al-banner>
      <al-banner
        variant="success"
        title="Success Banner"
        description="Operation completed successfully. All data has been saved."
        isExpanded
      ></al-banner>
      <al-banner
        variant="warning"
        title="Warning Banner"
        description="Please proceed with caution. Some features may not work as expected."
        isExpanded
      ></al-banner>
      <al-banner
        variant="danger"
        title="Danger Banner"
        description="An error has occurred. Please contact support if the issue persists."
        isExpanded
      ></al-banner>
    </div>
  `
};