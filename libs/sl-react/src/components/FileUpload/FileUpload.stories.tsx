import type { StoryObj } from '@storybook/react-webpack5';
import { SLFileUpload, SLIconDocument, SLButton } from '../..';

export default {
  title: 'Boilerplate/File Upload',
  component: SLFileUpload,
  parameters: { status: { type: 'beta' } },
  args: {
    name: 'file-upload',
    label: 'File upload',
    hideLabel: true,
    fieldNote: 'Supported format: .xml',
    children: (
      <>
        <SLIconDocument size="xl"></SLIconDocument>
        <span><strong>Drag and Drop files here</strong><br/>or</span>
        <SLButton>Browse Files</SLButton>
      </>
    )
  },
};

export const Default: StoryObj<typeof SLFileUpload> = { args: {} };

export const Disabled: StoryObj<typeof SLFileUpload> = { args: {
  isDisabled: true
} };
