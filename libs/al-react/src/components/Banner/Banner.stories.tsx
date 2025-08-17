import type { StoryObj } from '@storybook/react-webpack5';
import { ALBanner, ALTextPassage, ALButton } from '../..';

export default {
  title: 'Atoms/Banner',
  component: ALBanner,
  parameters: {
    status: 'beta',
    actions: {
      handles: ['onExpand', 'onCollapse']
    }
  },
  argTypes: {
    variant: {
      options: ['info', 'success', 'warning', 'danger'],
      control: { type: 'select' }
    },
    title: {
      control: 'text'
    },
    description: {
      control: 'text'
    },
    isExpanded: {
      control: 'boolean'
    },
    isCollapsible: {
      control: 'boolean'
    },
    showDescription: {
      control: 'boolean'
    }
  },
  args: {
    title: 'Banner Title',
    variant: 'info',
    isExpanded: false,
    isCollapsible: true,
    showDescription: true
  }
};

export const Default: StoryObj<typeof ALBanner> = {};

export const Info: StoryObj<typeof ALBanner> = {
  args: {
    variant: 'info',
    title: 'Information',
    description: 'This is an informational message to help users understand something.'
  }
};

export const Success: StoryObj<typeof ALBanner> = {
  args: {
    variant: 'success',
    title: 'Success',
    description: 'Your changes have been saved successfully.'
  }
};

export const Warning: StoryObj<typeof ALBanner> = {
  args: {
    variant: 'warning',
    title: 'Warning',
    description: 'Please review your information before proceeding.'
  }
};

export const Danger: StoryObj<typeof ALBanner> = {
  args: {
    variant: 'danger',
    title: 'Error',
    description: 'There was an error processing your request. Please try again.'
  }
};

export const Expanded: StoryObj<typeof ALBanner> = {
  args: {
    variant: 'info',
    title: 'Expanded Banner',
    description: 'This banner is expanded by default, showing the full description text. Users can collapse it using the toggle button.',
    isExpanded: true
  }
};

export const WithActions: StoryObj<typeof ALBanner> = {
  args: {
    variant: 'warning',
    title: 'Action Required',
    description: 'Your session is about to expire. Please save your work.',
    isExpanded: true,
    children: (
      <>
        <ALButton slot="actions" variant="secondary" size="sm">Save Work</ALButton>
        <ALButton slot="actions" variant="bare" size="sm">Dismiss</ALButton>
      </>
    )
  }
};

export const NonCollapsible: StoryObj<typeof ALBanner> = {
  args: {
    variant: 'danger',
    title: 'Critical Error',
    description: 'System maintenance in progress. Some features may be unavailable.',
    isExpanded: true,
    isCollapsible: false
  }
};

export const WithSlotContent: StoryObj<typeof ALBanner> = {
  args: {
    variant: 'info',
    title: 'Custom Content',
    isExpanded: true,
    children: (
      <ALTextPassage>
        <p>This is custom content using the default slot.</p>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
          <li>Item 3</li>
        </ul>
      </ALTextPassage>
    )
  }
};

export const AllVariants: StoryObj<typeof ALBanner> = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <ALBanner
        variant="info"
        title="Info Banner"
        description="This is an informational message."
      />
      <ALBanner
        variant="success"
        title="Success Banner"
        description="Operation completed successfully."
      />
      <ALBanner
        variant="warning"
        title="Warning Banner"
        description="Please proceed with caution."
      />
      <ALBanner
        variant="danger"
        title="Danger Banner"
        description="An error has occurred."
      />
    </div>
  )
};

export const AllVariantsExpanded: StoryObj<typeof ALBanner> = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <ALBanner
        variant="info"
        title="Info Banner"
        description="This is an informational message with more details when expanded."
        isExpanded
      />
      <ALBanner
        variant="success"
        title="Success Banner"
        description="Operation completed successfully. All data has been saved."
        isExpanded
      />
      <ALBanner
        variant="warning"
        title="Warning Banner"
        description="Please proceed with caution. Some features may not work as expected."
        isExpanded
      />
      <ALBanner
        variant="danger"
        title="Danger Banner"
        description="An error has occurred. Please contact support if the issue persists."
        isExpanded
      />
    </div>
  )
};

function toggleBanner() {
  const banner = document.querySelector<any>('al-banner');
  if (banner) {
    banner.toggleExpanded();
  }
}

export const WithToggleButton: StoryObj<typeof ALBanner> = {
  args: {
    variant: 'info',
    title: 'Controlled Banner',
    description: 'This banner can be toggled externally.',
    isExpanded: false
  },
  decorators: [
    (Story) => (
      <div>
        <ALButton onClick={toggleBanner} style={{ marginBottom: '16px' }}>
          Toggle Banner
        </ALButton>
        {Story()}
      </div>
    )
  ]
};