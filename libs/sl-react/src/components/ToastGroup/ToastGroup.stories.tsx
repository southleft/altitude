import type { StoryObj } from '@storybook/react-webpack5';
import { SLToastGroup, SLToast, SLButton, SLIconDone, SLProgress } from '../..';

export default {
  title: 'Components/Toast Group',
  component: SLToastGroup,
  subcomponents: { SLToast },
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onToastGroupOpen', 'onToastGroupClose', 'onToastGroupPrevious', 'onToastGroupNext', 'onToastClose']
    },
    controls: {
      exclude: ['activeToastIdx', 'prevActiveIdx', 'toasts', 'toastsVisible', 'controlPrev', 'controlNext']
    }
  },
  argTypes: {
    position: {
      control: { type: 'radio' },
      options: ['default', 'top', 'bottom']
    },
    isActive: {
      control: 'boolean'
    },
    isGroup: {
      control: 'boolean'
    },
    hasControls: {
      control: 'boolean'
    },
    autoClose: {
      control: 'boolean'
    },
    autoCloseDelay: {
      control: 'number'
    }
  },
  args: {
    isActive: true,
    children: (
      <>
        <SLToast description="This is a toast">
          Toast title A
          <SLButton slot="actions" variant="secondary"><SLIconDone slot="before"></SLIconDone>Label</SLButton>
          <SLButton slot="actions"><SLIconDone slot="before"></SLIconDone>Label</SLButton>
        </SLToast>
        <SLToast variant="success" description="This is a success toast">
          Toast title B
          <SLButton slot="actions" variant="secondary"><SLIconDone slot="before"></SLIconDone>Label</SLButton>
          <SLButton slot="actions"><SLIconDone slot="before"></SLIconDone>Label</SLButton>
        </SLToast>
        <SLToast variant="warning" description="This is a warning toast">
          Toast title C
          <SLButton slot="actions" variant="secondary"><SLIconDone slot="before"></SLIconDone>Label</SLButton>
          <SLButton slot="actions"><SLIconDone slot="before"></SLIconDone>Label</SLButton>
        </SLToast>
        <SLToast variant="danger" description="This is a danger toast">
          Toast title D
          <SLButton slot="actions" variant="secondary"><SLIconDone slot="before"></SLIconDone>Label</SLButton>
          <SLButton slot="actions"><SLIconDone slot="before"></SLIconDone>Label</SLButton>
        </SLToast>
      </>
    )
  }
};

function openToastGroup() {
  const toastGroup = document.querySelector<any>('.c-toast-group').querySelector('*');
  if (toastGroup) {
    toastGroup.open();
  }
}

function closeToastGroup() {
  const toastGroup = document.querySelector<any>('.c-toast-group').querySelector('*');
  if (toastGroup) {
    toastGroup.close();
  }
}

export const Default: StoryObj<typeof SLToastGroup> = { args: {} };

export const WithDismissible: StoryObj<typeof SLToastGroup> = {
  args: {
    children: (
      <>
        <SLToast isDismissible={true} description="This is a toast">
          Toast title A
        </SLToast>
        <SLToast isDismissible={true} variant="success" description="This is a success toast">
          Toast title B
        </SLToast>
        <SLToast isDismissible={true} variant="warning" description="This is a warning toast">
          Toast title C
        </SLToast>
        <SLToast isDismissible={true} variant="danger" description="This is a danger toast">
          Toast title D
        </SLToast>
      </>
    )
  }
};

export const WithAutoClose: StoryObj<typeof SLToastGroup> = { args: {
  autoClose: true,
} };

export const WithAutoCloseWithProgress: StoryObj<typeof SLToastGroup> = {
  args: {
    autoClose: true,
    autoCloseDelay: '4',
    children: (
      <>
        <SLToast description="This is a toast">
          Toast title A
          <SLButton slot="actions" variant="secondary"><SLIconDone slot="before"></SLIconDone>Label</SLButton>
          <SLButton slot="actions"><SLIconDone slot="before"></SLIconDone>Label</SLButton>
        </SLToast>
        <SLProgress currentProgress={100} endProgress={0} duration={4}></SLProgress>
      </>
    ),
  }
};

export const WithPositionTop: StoryObj<typeof SLToastGroup> = {
  args: {
    position: 'top',
    ...WithDismissible.args,
  }
};

export const WithPositionBottom: StoryObj<typeof SLToastGroup> = {
  args: {
    position: 'bottom',
    ...WithDismissible.args,
  }
};

export const WithGroup: StoryObj<typeof SLToastGroup> = {
  args: {
    isGroup: true
  }
};

export const WithGroupPositionTop: StoryObj<typeof SLToastGroup> = {
  args: {
    isGroup: true,
    position: 'top',
    ...WithDismissible.args,
  }
};

export const WithGroupPositionBottom: StoryObj<typeof SLToastGroup> = {
  args: {
    isGroup: true,
    position: 'bottom',
    ...WithDismissible.args,
  }
};

export const WithGroupControls: StoryObj<typeof SLToastGroup> = {
  args: {
    isGroup: true,
    hasControls: true
  }
};

export const WithGroupControlsPositionTop: StoryObj<typeof SLToastGroup> = {
  args: {
    isGroup: true,
    hasControls: true,
    position: 'top',
    ...WithDismissible.args,
  }
};

export const WithGroupControlsPositionBottom: StoryObj<typeof SLToastGroup> = {
  args: {
    isGroup: true,
    hasControls: true,
    position: 'bottom',
    ...WithDismissible.args,
  }
};

export const WithTriggers: StoryObj<typeof SLToastGroup> = {
  args: {
    isActive: false,
    isGroup: true,
    hasControls: true
  },
  decorators: [
    (Story) => (
      <div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <SLButton onClick={openToastGroup}>Open Toast Group</SLButton>
          <SLButton onClick={closeToastGroup} variant="secondary">Close Toast Group</SLButton>
        </div>
        <div className="c-toast-group">{Story()}</div>
      </div>
    )
  ]
};
