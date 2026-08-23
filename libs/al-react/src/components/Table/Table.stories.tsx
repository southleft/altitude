import type { StoryObj } from '@storybook/react-vite';
import { ALTable } from '../..';

const columns = [
  { key: 'name', label: 'Name', isSortable: true },
  { key: 'role', label: 'Role', isSortable: true },
  { key: 'team', label: 'Team' },
  { key: 'status', label: 'Status', align: 'end' as const }
];

const data = [
  { id: '1', name: 'Ada Lovelace', role: 'Engineer', team: 'Platform', status: 'Active' },
  { id: '2', name: 'Grace Hopper', role: 'Engineer', team: 'Compilers', status: 'Active' },
  { id: '3', name: 'Margaret Hamilton', role: 'Director', team: 'Flight Software', status: 'Active' },
  { id: '4', name: 'Katherine Johnson', role: 'Analyst', team: 'Trajectory', status: 'Invited' }
];

export default {
  title: 'Molecules/Table',
  component: ALTable,
  parameters: {
    status: { type: 'beta' },
    actions: { handles: ['onTableSort', 'onTableRowSelect', 'onTableSelectAll'] }
  },
  args: {
    caption: 'Team roster',
    columns,
    data
  }
};

export const Default: StoryObj<typeof ALTable> = { args: {} };

export const Selectable: StoryObj<typeof ALTable> = {
  args: { isSelectable: true }
};
