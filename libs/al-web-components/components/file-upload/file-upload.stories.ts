import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../button/button';
import '../icon/icons/document';
import './file-upload';

export default {
  title: 'Molecules/File Upload',
  component: 'al-file-upload',
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
  <al-file-upload ${spread(args)}>
    <al-icon-document size="xxl"></al-icon-document>
    <span><strong>Drag and Drop files here</strong><br/>or</span>
    <al-button>Browse Files</al-button>
  </al-file-upload>
`;

export const Default = Template.bind({});
Default.args = {};

export const Disabled = Template.bind({});
Disabled.args = {
  isDisabled: true
};
