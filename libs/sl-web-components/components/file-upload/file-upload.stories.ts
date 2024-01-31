import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../button/button';
import '../icon/icons/document';
import './file-upload';

export default {
  title: 'Molecules/File Upload',
  component: 'sl-file-upload',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onFileUploadFileRemove', 'onFileUploadFileUpload']
    }
  },
  decorators: [ withActions ],
  args: {
    name: 'file-upload',
    label: 'File upload',
    hideLabel: true,
    fieldNote: 'Supported format: .xml',
  }
};

const Template = (args) => html`
  <sl-file-upload ${spread(args)}>
    <sl-icon-document size="xl"></sl-icon-document>
    <span><strong>Drag and Drop files here</strong><br/>or</span>
    <sl-button>Browse Files</sl-button>
  </sl-file-upload>
`;

export const Default = Template.bind({});
Default.args = {};

export const Disabled = Template.bind({});
Disabled.args = {
  isDisabled: true
};
