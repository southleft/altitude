import { html } from 'lit';
import { withActions } from 'storybook/actions/decorator';
import '../button/button';
import './command-palette';

const actions = [
  { id: 'new-file', label: 'New file', group: 'File', keywords: ['create', 'add'] },
  { id: 'open-file', label: 'Open file…', group: 'File', keywords: ['load'] },
  { id: 'save-file', label: 'Save file', group: 'File', keywords: ['persist'] },
  { id: 'theme-light', label: 'Switch to light theme', group: 'Theme', keywords: ['appearance', 'mode'] },
  { id: 'theme-dark', label: 'Switch to dark theme', group: 'Theme', keywords: ['appearance', 'mode'] },
  { id: 'brand-default', label: 'Switch brand: Default', group: 'Theme', keywords: ['brand'] },
  { id: 'go-dashboard', label: 'Go to Dashboard', group: 'Navigate', keywords: ['home'] },
  { id: 'go-settings', label: 'Go to Settings', group: 'Navigate', keywords: ['preferences'] },
  { id: 'invite-user', label: 'Invite a teammate', group: 'Team', keywords: ['add person'] }
];

const meta = {
  title: 'Molecules/Navigation/Command Palette',
  component: 'al-command-palette',
  tags: ['autodocs'],
  parameters: {
    status: { type: 'beta' },
    actions: { handles: ['onCommandPaletteOpen', 'onCommandPaletteClose', 'onCommandPaletteAction'] }
  },
  decorators: [withActions]
};

export default meta;

export const Default = {
  render: () => {
    const openPalette = (e: Event) => {
      const root = (e.currentTarget as HTMLElement).closest('.al-command-palette-story');
      (root?.querySelector('al-command-palette') as any)?.open();
    };
    return html`
      <div class="al-command-palette-story">
        <al-button variant="secondary" @click=${openPalette}>Open command palette</al-button>
        <al-command-palette .actions=${actions}></al-command-palette>
      </div>
    `;
  }
};

export const KeyboardShortcut = {
  render: () => html`
    <p>Press <kbd>Cmd/Ctrl</kbd> + <kbd>K</kbd> to open.</p>
    <al-command-palette .actions=${actions} enableShortcut></al-command-palette>
  `
};

export const Empty = {
  render: () => html` <al-command-palette .actions=${[]} isActive emptyText="No commands registered."></al-command-palette> `
};

export const NoGroups = {
  render: () =>
    html`
      <al-command-palette
        .actions=${actions.map(({ id, label, keywords }) => ({ id, label, keywords }))}
        isActive
      ></al-command-palette>
    `
};
