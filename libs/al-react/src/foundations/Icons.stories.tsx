// Foundations/Icons — the React Storybook's copy.
// Shared element, re-authored CSF shim. See `./Utilities.stories.tsx`.
//
// `<icon-catalog>` resolves its glyphs through Vite dynamic `import()` of the
// Phosphor glyph modules rather than fetching SVG files over HTTP, so it needs
// no `staticDirs` entry here — it works the same way in both Storybooks.

import type { Meta, StoryObj } from '@storybook/react-vite';

// Side-effect import: defines the `icon-catalog` element.
import '../../../al-web-components/.storybook/components/icon-catalog/icon-catalog';

const meta: Meta = {
  title: 'Foundations/Icons',
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

export const Catalog: Story = { render: () => <icon-catalog /> };
