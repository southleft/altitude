import { html } from 'lit';
import { withActions } from 'storybook/actions/decorator';
import './table';

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
  { id: '4', name: 'Katherine Johnson', role: 'Analyst', team: 'Trajectory', status: 'Invited' },
  { id: '5', name: 'Radia Perlman', role: 'Engineer', team: 'Networking', status: 'Active' }
];

const manyColumns = [
  ...columns,
  { key: 'location', label: 'Location' },
  { key: 'startDate', label: 'Start date' },
  { key: 'manager', label: 'Manager' },
  { key: 'level', label: 'Level' }
];

const meta = {
  title: 'Organisms/Table',
  component: 'al-table',
  tags: ['autodocs'],
  parameters: {
    status: { type: 'beta' },
    actions: { handles: ['onTableSort', 'onTableRowSelect', 'onTableSelectAll'] }
  },
  decorators: [withActions]
};

export default meta;

export const Default = {
  render: () => html` <al-table caption="Team roster" .columns=${columns} .data=${data}></al-table> `
};

export const Sortable = {
  render: () => {
    const handleSort = (e: CustomEvent) => {
      const { key, direction } = e.detail as { key?: string; direction: string };
      const target = e.currentTarget as any;
      if (!key || direction === 'none') {
        target.data = data;
        return;
      }
      const sorted = [...data].sort((a, b) => {
        const av = String(a[key as keyof typeof a]);
        const bv = String(b[key as keyof typeof b]);
        return direction === 'ascending' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
      target.data = sorted;
    };
    return html`
      <al-table caption="Team roster (click a sortable column)" .columns=${columns} .data=${data} @onTableSort=${handleSort}></al-table>
    `;
  }
};

export const Selectable = {
  render: () => html` <al-table caption="Team roster" .columns=${columns} .data=${data} isSelectable></al-table> `
};

export const ResponsiveOverflow = {
  render: () =>
    html`
      <div style="max-width: 480px;">
        <al-table caption="Team roster (scrolls horizontally inside the component)" .columns=${manyColumns} .data=${data} isSelectable></al-table>
      </div>
    `
};

export const SlottedMarkup = {
  render: () =>
    html`
      <al-table caption="Custom markup">
        <table style="width:100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Role</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Ada Lovelace</td>
              <td>Engineer</td>
            </tr>
            <tr>
              <td>Grace Hopper</td>
              <td>Engineer</td>
            </tr>
          </tbody>
        </table>
      </al-table>
    `
};
