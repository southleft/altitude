import type { StoryObj } from '@storybook/react-webpack5';
import { SLAlert, SLTextPassage, SLButton } from '../..';

export default {
  title: 'Components/Alert',
  component: SLAlert,
  parameters: {
    status: 'beta',
    actions: {
      handles: ['keydown', 'onAlertOpen', 'onAlertClose', 'onAlertExpand', 'onAlertCollapse']
    },
    controls: {
      exclude: ['hasPanel', 'ariaControls', 'ariaLabelledBy']
    },
  },
  argTypes: {
    variant: {
      options: ['default', 'success', 'warning', 'danger'],
      control: { type: 'radio' }
    },
    isActive: {
      control: 'boolean'
    },
    isExpanded: {
      control: 'boolean'
    },
    autoClose: {
      control: 'boolean'
    },
    autoCloseDelay: {
      control: 'number'
    },
  },
  args: {
    isActive: true,
    children: (
      <>
        Alert title
        <SLTextPassage slot="panel">Something longer like a description should go here, and maybe a brief on what triggered this alert.</SLTextPassage>
      </>
    )
  }
};

function closePanel() {
  const alert = document.querySelector<any>('.c-alert').querySelector('*');
  if (alert) {
    alert.toggleExpanded();
  }
}

function closeAlert() {
  const alert = document.querySelector<any>('.c-alert').querySelector('*');
  if (alert) {
    alert.close();
  }
}

function openAlert() {
  const alert = document.querySelector<any>('.c-alert').querySelector('*');
  if (alert) {
    alert.open();
  }
}

export const Default: StoryObj<typeof SLAlert> = {};


export const Success: StoryObj<typeof SLAlert> = {
  args: {
    variant: 'success'
  }
};

export const Warning: StoryObj<typeof SLAlert> = {
  args: {
    variant: 'warning'
  }
};

export const Danger: StoryObj<typeof SLAlert> = {
  args: {
    variant: 'danger'
  }
};

export const WithoutPanel: StoryObj<typeof SLAlert> = {
  args: {
    children: 'Alert title',
    hasPanel: false,
  }
};

export const WithAutoClose: StoryObj<typeof SLAlert> = {
  args: {
    autoClose: true,
  }
};

export const WithClosePanel: StoryObj<typeof SLAlert> = {
  args: {
    children: (
      <>
        Alert title
        <SLTextPassage slot="panel">Something longer like a description should go here, and maybe a brief on what triggered this alert.</SLTextPassage>
        <SLButton slot="panel" onClick={closePanel}>Dismiss</SLButton>
      </>
    )
  },
  decorators: [
    (Story) => (
      <div className="c-alert">{Story()}</div>
    )
  ],
};

export const WithCloseButton: StoryObj<typeof SLAlert> = {
  args: {
    children: (
      <>
        Alert title
        <SLTextPassage slot="panel">Something longer like a description should go here, and maybe a brief on what triggered this alert.</SLTextPassage>
        <SLButton slot="panel" onClick={closeAlert}>Ok</SLButton>
      </>
    )
  },
  decorators: [
    ...WithClosePanel.decorators
  ]
};

export const WithOpenButton: StoryObj<typeof SLAlert> = {
  args: {
    isActive: false,
    ...WithCloseButton.args,
  },
  decorators: [
    (Story) => (
      <div>
        <SLButton onClick={openAlert}>Show Alert</SLButton>
        <div className="c-alert">{Story()}</div>
      </div>
    )
  ],
};