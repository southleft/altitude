import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../button/button';
import '../text-block/text-block';
import './alert';
import { ALAlert } from './alert';

export default {
  title: 'Atoms/Alert',
  component: 'al-alert',
  tags: [ 'autodocs' ],
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
    isActive: true
  }
};

function closeAlert() {
  const alert = document.querySelector<any>('al-alert');
  if (alert) {
    alert.close();
  }
}

function openAlert() {
  const alert = document.querySelector<any>('al-alert');
  if (alert) {
    alert.open();
  }
}

const DEFAULT_BODY = 'Tokens v2 ships next week.';

const Template = ({ body, isActive, ...args }) =>
  html`<al-alert ${spread(args)} ?isActive=${isActive} data-testid="alert">
    <al-text-block>${body ?? DEFAULT_BODY}</al-text-block>
  </al-alert>`;

const TemplateWithAction = ({ body, isActive, ...args }) =>
html`<al-alert ${spread(args)} ?isActive=${isActive} data-testid="alert">
  <al-text-block>${body ?? DEFAULT_BODY}</al-text-block>
  <al-button slot="action" data-testid="action" variant="tertiary" size="sm">View changes</al-button>
</al-alert>`;

export const Default = Template.bind({});
Default.args = {
  isActive: true,
  title: 'Heads up.'
};

export const Success = Template.bind({});
Success.args = {
  isActive: true,
  variant: 'success',
  title: 'Published.',
  body: '42 components synced.'
};

export const Warning = Template.bind({});
Warning.args = {
  isActive: true,
  variant: 'warning',
  title: 'Deprecation.',
  body: 'Floating labels removed in v2.'
};

export const Danger = Template.bind({});
Danger.args = {
  isActive: true,
  variant: 'danger',
  title: 'Build failed.',
  body: '3 token references unresolved.'
};

export const DefaultDismissible = Template.bind({});
DefaultDismissible.args = {  
  isDismissible: true
};

export const WithAction = TemplateWithAction.bind({});

export const WithActionDismissible = TemplateWithAction.bind({});
WithActionDismissible.args = {
  isDismissible: true
};

export const WithTitle = Template.bind({});
WithTitle.args = {
  title: 'Heads up.'
};

export const WithTitleAndAction = TemplateWithAction.bind({});
WithTitleAndAction.args = {
  title: 'Heads up.'
};

export const WithTitleAndActionDismissible = TemplateWithAction.bind({});
WithTitleAndActionDismissible.args = {
  title: 'Alert Title',
  isDismissible: true
};

const TemplateOpenAlert = (args) => html`
  <div>
    <al-button @click=${openAlert} data-testid="open-alert">Show Alert</al-button>
    <al-alert ${spread(args)} data-testid="alert">
      <al-text-block>
        This is an alert. It is used to notify the user of something important.
      </al-text-block>
      <al-button slot="action" data-testid="action" variant="tertiary" @click=${closeAlert}>Action</al-button>
    </al-alert>
  </div>
`;
export const WithOpenButton = TemplateOpenAlert.bind({});
WithOpenButton.args = {
  isActive: false,
  isDismissible: true
};

export const WithAutoClose = Template.bind({});
WithAutoClose.args = {
  autoClose: true
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/
