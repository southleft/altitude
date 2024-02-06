import type { StoryObj } from '@storybook/react-webpack5';
import { SLToastGroup, SLToast, SLButton, SLIconDone } from '../..';

export default {
  title: 'Molecules/Toast Group',
  component: SLToastGroup,
  subcomponents: { SLToast },
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
        <SLToast description="This is a toast" isActive="true">
          Toast title A
          <SLButton slot="actions" variant="secondary"><SLIconDone slot="before"></SLIconDone>Label</SLButton>
          <SLButton slot="actions"><SLIconDone slot="before"></SLIconDone>Label</SLButton>
        </SLToast>
        <SLToast description="This is a toast" isActive="true">
          Toast title B
          <SLButton slot="actions" variant="secondary"><SLIconDone slot="before"></SLIconDone>Label</SLButton>
          <SLButton slot="actions"><SLIconDone slot="before"></SLIconDone>Label</SLButton>
        </SLToast>
        <SLToast description="This is a toast" isActive="true">
          Toast title C
          <SLButton slot="actions" variant="secondary"><SLIconDone slot="before"></SLIconDone>Label</SLButton>
          <SLButton slot="actions"><SLIconDone slot="before"></SLIconDone>Label</SLButton>
        </SLToast>
        <SLToast description="This is a toast" isActive="true">
          Toast title D
          <SLButton slot="actions" variant="secondary"><SLIconDone slot="before"></SLIconDone>Label</SLButton>
          <SLButton slot="actions"><SLIconDone slot="before"></SLIconDone>Label</SLButton>
        </SLToast>
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

export const Default: StoryObj<typeof SLToastGroup> = { args: {} };

export const WithDismissible: StoryObj<typeof SLToastGroup> = {
  args: {
    children: (
      <>
        <SLToast isDismissible={true} isActive="true" isDismissible="true"
         description="This is a toast" id="toast-01">
          Toast title A
        </SLToast>
        <SLToast isDismissible={true} isActive="true" isDismissible="true" description="This is a toast" id="toast-02">
          Toast title B
        </SLToast>
        <SLToast isDismissible={true} isActive="true" isDismissible="true" description="This is a toast" id="toast-03">
          Toast title C
        </SLToast>
        <SLToast isDismissible={true} isActive="true" isDismissible="true" description="This is a toast" id="toast-04">
          Toast title D
        </SLToast>
      </>
    )
  }
};

export const WithAutoClose: StoryObj<typeof SLToastGroup> = { args: {
  children: (
    <>
      <SLToast isActive="true" autoClose="true"
       description="This toast will auto close in 3 seconds">
        Toast title A
      </SLToast>
      <SLToast isActive="true" autoClose="true" autoCloseDelay="4" description="This toast will auto close in 4 seconds">
        Toast title B
      </SLToast>
      <SLToast isActive="true" autoClose="true" autoCloseDelay="5" description="This toast will auto close in 5 seconds">
        Toast title C
      </SLToast>
      <SLToast isActive="true" autoClose="true" autoCloseDelay="6" description="This toast will auto close in 6 seconds">
        Toast title D
      </SLToast>
    </>
  )
} };

export const WithPositionTop: StoryObj<typeof SLToastGroup> = {
  args: {
    position: 'top',
    isActive: false,
    children: (
      <>
        <SLToast description="This is a toast" isDismissible="true" id="toast-01">
          Toast title A
        </SLToast>
        <SLToast description="This is a toast" isDismissible="true" id="toast-02">
          Toast title B
        </SLToast>
        <SLToast description="This is a toast" isDismissible="true" id="toast-03">
          Toast title C
        </SLToast>
        <SLToast description="This is a toast" isDismissible="true" id="toast-04">
          Toast title D
        </SLToast>
      </>
    )
  },
  decorators: [
    (Story) => (
      <div>
        <SLButton onClick={addToast} style={{position: 'absolute', bottom: '16px', right: '16px'}}>Add Toast</SLButton>
        <div className="c-toast-group">{Story()}</div>
      </div>
    )
  ]
};

export const WithPositionBottom: StoryObj<typeof SLToastGroup> = {
  args: {
    ...WithPositionTop.args,
    position: 'bottom'
  },
  decorators: [
    (Story) => (
      <div>
        <SLButton onClick={addToast}>Add Toast</SLButton>
        <div className="c-toast-group">{Story()}</div>
      </div>
    )
  ]
};