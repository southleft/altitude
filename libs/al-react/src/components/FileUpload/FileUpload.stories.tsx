import type { StoryObj } from '@storybook/react-webpack5';
import { ALFileUpload, ALIconDocument, ALButton } from '../..';

export default {
  title: 'Molecules/File Upload',
  component: ALFileUpload,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onFileUploadFileRemove', 'onFileUploadFileUpload']
    }
  },
  args: {
    name: 'file-upload',
    label: 'File upload',
    hideLabel: true,
    fieldNote: 'Supported format: .xml',
    children: (
      <>
        <ALIconDocument size="xl"></ALIconDocument>
        <span><strong>Drag and Drop files here</strong><br/>or</span>
        <ALButton>Browse Files</ALButton>
      </>
    )
  },
};

export const Default: StoryObj<typeof ALFileUpload> = { args: {} };

export const Disabled: StoryObj<typeof ALFileUpload> = { args: {
  isDisabled: true
} };
