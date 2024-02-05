import type { StoryObj } from '@storybook/react-webpack5';
import { SLAlert, SLTextPassage, SLButton } from '../..';

export default {
  title: 'Atoms/Alert',
  component: SLAlert,
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
        <SLTextPassage>This is an alert. It is used to notify the user of something important.</SLTextPassage>
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

export const DefaultDismissible: StoryObj<typeof SLAlert> = {
  args: {
    isDismissible: true
  }
};

export const WithAction: StoryObj<typeof SLAlert> = {
  args: {
    children: (
      <>
        <SLTextPassage>This is an alert. It is used to notify the user of something important.</SLTextPassage>
        <SLButton slot="action" variant="secondary">Action</SLButton>
      </>
    )
  }
};

export const WithActionDismissible: StoryObj<typeof SLAlert> = {
  args: {
    ...WithAction.args,
    isDismissible: true
  }
};

export const WithTitle: StoryObj<typeof SLAlert> = {
  args: {
    title: 'Alert Title'
  }
};

export const WithTitleAndAction: StoryObj<typeof SLAlert> = {
  args: {
    ...WithAction.args,
    title: 'Alert Title'
  }
};

export const WithTitleAndActionDismissible: StoryObj<typeof SLAlert> = {
  args: {
    ...WithAction.args,
    title: 'Alert Title',
    isDismissible: true
  }
};

export const WithOpenButton: StoryObj<typeof SLAlert> = {
  args: {
    isActive: false,
    isDismissible: true
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

export const WithAutoClose: StoryObj<typeof SLAlert> = {
  args: {
    autoClose: true,
  }
};