import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALAlert, ALTextPassage, ALButton } from '../..';

export default {
  title: 'Atoms/Alert',
  component: ALAlert,
  parameters: {
    status: 'beta',
    actions: {
      handles: ['keydown', 'onAlertOpen', 'onAlertClose']
    }
  },
  argTypes: {
    variant: {
      options: ['default', 'success', 'warning', 'danger'],
      control: { type: 'radio' }
    },
    title: {
      control: 'text'
    },
    isActive: {
      control: 'boolean'
    },
    autoClose: {
      control: 'boolean'
    },
    autoCloseDelay: {
      control: 'number'
    },
    isDismissible: {
      control: 'boolean'
    }
  },
  args: {
    isActive: true,
    children: (
      <>
        <ALTextPassage>This is an alert. It is used to notify the user of something important.</ALTextPassage>
      </>
    )
  }
};

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

export const Default: StoryObj<typeof ALAlert> = {};


export const Success: StoryObj<typeof ALAlert> = {
  args: {
    variant: 'success'
  }
};

export const Warning: StoryObj<typeof ALAlert> = {
  args: {
    variant: 'warning'
  }
};

export const Danger: StoryObj<typeof ALAlert> = {
  args: {
    variant: 'danger'
  }
};

export const DefaultDismissible: StoryObj<typeof ALAlert> = {
  args: {
    isDismissible: true
  }
};

export const WithAction: StoryObj<typeof ALAlert> = {
  args: {
    children: (
      <>
        <ALTextPassage>This is an alert. It is used to notify the user of something important.</ALTextPassage>
        <ALButton slot="action" variant="secondary">Action</ALButton>
      </>
    )
  }
};

export const WithActionDismissible: StoryObj<typeof ALAlert> = {
  args: {
    ...WithAction.args,
    isDismissible: true
  }
};

export const WithTitle: StoryObj<typeof ALAlert> = {
  args: {
    title: 'Alert Title'
  }
};

export const WithTitleAndAction: StoryObj<typeof ALAlert> = {
  args: {
    ...WithAction.args,
    title: 'Alert Title'
  }
};

export const WithTitleAndActionDismissible: StoryObj<typeof ALAlert> = {
  args: {
    ...WithAction.args,
    title: 'Alert Title',
    isDismissible: true
  }
};

export const WithOpenButton: StoryObj<typeof ALAlert> = {
  args: {
    isActive: false,
    isDismissible: true
  },
  decorators: [
    (Story) => (
      <div>
        <ALButton onClick={openAlert}>Show Alert</ALButton>
        <div className="c-alert">{Story()}</div>
      </div>
    )
  ],
};

export const WithAutoClose: StoryObj<typeof ALAlert> = {
  args: {
    autoClose: true,
  }
};