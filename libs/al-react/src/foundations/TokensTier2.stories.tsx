// Foundations/Tokens/Tier 2: Usage — the React Storybook's copy.
// Shared elements, re-authored CSF shim. See `./Utilities.stories.tsx`.

import type { Meta, StoryObj } from '@storybook/react-vite';

// Side-effect imports: each module calls `customElements.define`.
import '../../../al-web-components/.storybook/components/tokens/tier-2/tier-2-animation';
import '../../../al-web-components/.storybook/components/tokens/tier-2/tier-2-border';
import '../../../al-web-components/.storybook/components/tokens/tier-2/tier-2-colors';
import '../../../al-web-components/.storybook/components/tokens/tier-2/tier-2-icons';
import '../../../al-web-components/.storybook/components/tokens/tier-2/tier-2-layout';
import '../../../al-web-components/.storybook/components/tokens/tier-2/tier-2-opacity';
import '../../../al-web-components/.storybook/components/tokens/tier-2/tier-2-shadows';
import '../../../al-web-components/.storybook/components/tokens/tier-2/tier-2-space';
import '../../../al-web-components/.storybook/components/tokens/tier-2/tier-2-typography';

const meta: Meta = {
  title: 'Foundations/Tokens/Tier 2: Usage',
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

// Tier 2 has no Breakpoints or ZIndex page — matches the web-components file.
export const Animation: Story = { render: () => <tier-2-animation /> };
export const Border: Story = { render: () => <tier-2-border /> };
export const Colors: Story = { render: () => <tier-2-colors /> };
export const Icons: Story = { render: () => <tier-2-icons /> };
export const Layout: Story = { render: () => <tier-2-layout /> };
export const Opacity: Story = { render: () => <tier-2-opacity /> };
export const Shadows: Story = { render: () => <tier-2-shadows /> };
export const Space: Story = { render: () => <tier-2-space /> };
export const Typography: Story = { render: () => <tier-2-typography /> };
