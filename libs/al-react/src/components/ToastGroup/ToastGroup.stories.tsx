import type { StoryObj } from '@storybook/react-webpack5';
import { ALToastGroup, ALToast, ALButton, ALIconSuccess } from '../..';

export default {
  title: 'Molecules/Toast Group',
  component: ALToastGroup,
  subcomponents: { ALToast },
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onToastGroupOpen', 'onToastGroupClose', 'onToastClose']
    },
    controls: {
      exclude: ['toastList']
    }
  },
  argTypes: {
    position: {
      control: { type: 'radio' },
      options: ['default', 'top', 'bottom']
    },
    isActive: {
      control: 'boolean'
    }
  },
  args: {
    isActive: true,
    children: (
      <>
        <ALToast description="This is a toast" isActive="true">
          Toast title A
          <ALButton slot="actions" variant="secondary"><ALIconSuccess slot="before"></ALIconSuccess>Label</ALButton>
          <ALButton slot="actions"><ALIconSuccess slot="before"></ALIconSuccess>Label</ALButton>
        </ALToast>
        <ALToast description="This is a toast" isActive="true">
          Toast title B
          <ALButton slot="actions" variant="secondary"><ALIconSuccess slot="before"></ALIconSuccess>Label</ALButton>
          <ALButton slot="actions"><ALIconSuccess slot="before"></ALIconSuccess>Label</ALButton>
        </ALToast>
        <ALToast description="This is a toast" isActive="true">
          Toast title C
          <ALButton slot="actions" variant="secondary"><ALIconSuccess slot="before"></ALIconSuccess>Label</ALButton>
          <ALButton slot="actions"><ALIconSuccess slot="before"></ALIconSuccess>Label</ALButton>
        </ALToast>
        <ALToast description="This is a toast" isActive="true">
          Toast title D
          <ALButton slot="actions" variant="secondary"><ALIconSuccess slot="before"></ALIconSuccess>Label</ALButton>
          <ALButton slot="actions"><ALIconSuccess slot="before"></ALIconSuccess>Label</ALButton>
        </ALToast>
      </>
    )
  }
};

let toastCount = 0;
function addToast(e: MouseEvent) { 
  const toastGroup = document.querySelector<any>('.c-toast-group').querySelector('*');
  const toastToAdd = document.querySelector<any>(`#toast-0${toastCount + 1}`);

  if (toastGroup && !toastGroup.isActive) {
    toastGroup.open();
  }

  if (toastToAdd) {
    toastToAdd.open();
    toastCount++;
  }
  if (toastCount === 4) {
    e.target.isDisabled = true;
    toastCount = 0;
  }
}

export const Default: StoryObj<typeof ALToastGroup> = { args: {} };

export const WithDismissible: StoryObj<typeof ALToastGroup> = {
  args: {
    children: (
      <>
        <ALToast isDismissible={true} isActive="true" isDismissible="true"
         description="This is a toast" id="toast-01">
          Toast title A
        </ALToast>
        <ALToast isDismissible={true} isActive="true" isDismissible="true" description="This is a toast" id="toast-02">
          Toast title B
        </ALToast>
        <ALToast isDismissible={true} isActive="true" isDismissible="true" description="This is a toast" id="toast-03">
          Toast title C
        </ALToast>
        <ALToast isDismissible={true} isActive="true" isDismissible="true" description="This is a toast" id="toast-04">
          Toast title D
        </ALToast>
      </>
    )
  }
};

export const WithAutoClose: StoryObj<typeof ALToastGroup> = { args: {
  children: (
    <>
      <ALToast isActive="true" autoClose="true"
       description="This toast will auto close in 3 seconds">
        Toast title A
      </ALToast>
      <ALToast isActive="true" autoClose="true" autoCloseDelay="4" description="This toast will auto close in 4 seconds">
        Toast title B
      </ALToast>
      <ALToast isActive="true" autoClose="true" autoCloseDelay="5" description="This toast will auto close in 5 seconds">
        Toast title C
      </ALToast>
      <ALToast isActive="true" autoClose="true" autoCloseDelay="6" description="This toast will auto close in 6 seconds">
        Toast title D
      </ALToast>
    </>
  )
} };

export const WithPositionTop: StoryObj<typeof ALToastGroup> = {
  args: {
    position: 'top',
    isActive: false,
    children: (
      <>
        <ALToast description="This is a toast" isDismissible="true" id="toast-01">
          Toast title A
        </ALToast>
        <ALToast description="This is a toast" isDismissible="true" id="toast-02">
          Toast title B
        </ALToast>
        <ALToast description="This is a toast" isDismissible="true" id="toast-03">
          Toast title C
        </ALToast>
        <ALToast description="This is a toast" isDismissible="true" id="toast-04">
          Toast title D
        </ALToast>
      </>
    )
  },
  decorators: [
    (Story) => (
      <div>
        <ALButton onClick={addToast} style={{position: 'absolute', bottom: '16px', right: '16px'}}>Add Toast</ALButton>
        <div className="c-toast-group">{Story()}</div>
      </div>
    )
  ]
};

export const WithPositionBottom: StoryObj<typeof ALToastGroup> = {
  args: {
    ...WithPositionTop.args,
    position: 'bottom'
  },
  decorators: [
    (Story) => (
      <div>
        <ALButton onClick={addToast}>Add Toast</ALButton>
        <div className="c-toast-group">{Story()}</div>
      </div>
    )
  ]
};