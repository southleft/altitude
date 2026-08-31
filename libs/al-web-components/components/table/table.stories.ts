import { html } from 'lit';
import './table';
import '../avatar/avatar';
import '../badge/badge';
import '../layout/layout';

/*
 * Content is 1:1 with the v2 canvas data table — the library documenting
 * itself. `updated` is right-aligned because the canvas sets it in the mono
 * metadata face, where a ragged left edge reads as noise.
 */
const columns = [
  { key: 'component', label: 'Component', isSortable: true },
  { key: 'owner', label: 'Owner', isSortable: true },
  { key: 'status', label: 'Status' },
  { key: 'updated', label: 'Updated', align: 'end' as const }
];

const data = [
  { id: 'al-button', component: 'al-button', owner: 'T. Chen', status: 'Stable', updated: '2d ago' },
  { id: 'al-input', component: 'al-input', owner: 'M. Kim', status: 'In review', updated: '4h ago' },
  { id: 'al-input-stepper', component: 'al-input-stepper', owner: 'J. Ruiz', status: 'Redesign', updated: 'now' }
];

const manyColumns = [
  ...columns,
  { key: 'tier', label: 'Tier' },
  { key: 'a11y', label: 'Accessibility' },
  { key: 'figma', label: 'Figma parity' },
  { key: 'version', label: 'Version' }
];

const meta = {
  title: 'Molecules/Table',
  component: 'al-table',
  tags: ['autodocs'],
  parameters: {
    status: { type: 'beta' },
    actions: { handles: ['onTableSort', 'onTableRowSelect', 'onTableSelectAll'] }
  },
};

export default meta;

export const Default = {
  render: () => html`
    <al-table caption="Component roster" columns=${JSON.stringify(columns)} data=${JSON.stringify(data)}></al-table>
  `
};

/**
 * Slotted markup — the escape hatch for cells that need real components
 * (an avatar, a status badge) rather than the plain values `data` can carry.
 *
 * WHAT YOU GIVE UP: the component's cell styling. `al-table` paints the table
 * it renders ITSELF via BEM classes inside its shadow root; a slotted
 * `<table>` stays in the light DOM, where `::slotted()` can reach the
 * `<table>` element but none of its `<tr>`/`<th>`/`<td>` descendants. So
 * these rows arrive unstyled and the surrounding page owns their appearance.
 *
 * Prefer `columns`/`data` (see `Default`) unless a cell genuinely needs a
 * component inside it.
 */
export const SlottedRich = {
  render: () => html`
    <al-table caption="Component roster">
      <table>
        <thead>
          <tr>
            <th scope="col">Component</th>
            <th scope="col">Owner</th>
            <th scope="col">Status</th>
            <th scope="col">Updated</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>al-button</td>
            <td><al-layout direction="row" gap="sm" align="center"><al-avatar variant="sm">TC</al-avatar>T. Chen</al-layout></td>
            <td><al-badge variant="success">Stable</al-badge></td>
            <td>2d ago</td>
          </tr>
          <tr>
            <td>al-input</td>
            <td><al-layout direction="row" gap="sm" align="center"><al-avatar variant="sm">MK</al-avatar>M. Kim</al-layout></td>
            <td><al-badge variant="warning">In review</al-badge></td>
            <td>4h ago</td>
          </tr>
          <tr>
            <td>al-input-stepper</td>
            <td><al-layout direction="row" gap="sm" align="center"><al-avatar variant="sm">JR</al-avatar>J. Ruiz</al-layout></td>
            <td><al-badge variant="danger">Redesign</al-badge></td>
            <td>now</td>
          </tr>
        </tbody>
      </table>
    </al-table>
  `
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
      <al-table caption="Component roster (click a sortable column)" .columns=${columns} .data=${data} @onTableSort=${handleSort}></al-table>
    `;
  }
};

export const Selectable = {
  render: () => html` <al-table caption="Component roster" .columns=${columns} .data=${data} isSelectable></al-table> `
};

export const ResponsiveOverflow = {
  render: () =>
    html`
      <div style="max-width: 480px;">
        <al-table caption="Component roster (scrolls horizontally inside the component)" .columns=${manyColumns} .data=${data} isSelectable></al-table>
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
