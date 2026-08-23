import type { StoryObj } from '@storybook/react-vite';
import { ALCommandPalette } from '../..';

const actions = [
  { id: 'new-file', label: 'New file', group: 'File' },
  { id: 'open-file', label: 'Open file…', group: 'File' },
  { id: 'theme-light', label: 'Switch to light theme', group: 'Theme' },
  { id: 'theme-dark', label: 'Switch to dark theme', group: 'Theme' }
];

export default {
  title: 'Molecules/Command Palette',
  component: ALCommandPalette,
  parameters: {
    status: { type: 'beta' },
    actions: { handles: ['onCommandPaletteOpen', 'onCommandPaletteClose', 'onCommandPaletteAction'] }
  },
  args: {
    actions
  }
};

export const Default: StoryObj<typeof ALCommandPalette> = { args: { isActive: true } };

export const KeyboardShortcut: StoryObj<typeof ALCommandPalette> = { args: { enableShortcut: true } };
