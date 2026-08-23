// Foundations/Tokens/Tier 1: Definitions — the React Storybook's copy.
//
// The documentation ELEMENTS are shared with the web-components Storybook (see
// `./Utilities.stories.tsx` for the full rationale); only the CSF shim is
// re-authored, because a Storybook has one renderer and the web-components CSF
// returns lit-html `TemplateResult`s that React cannot render.
//
// `title` is byte-identical to
// `@southleft/al-web-components/.storybook/components/tokens/tier-1/tier-1.stories.ts`
// so the page lands at the same sidebar path in both Storybooks.

import type { Meta, StoryObj } from '@storybook/react-vite';

// Side-effect imports: each module calls `customElements.define`.
import '../../../al-web-components/.storybook/components/tokens/tier-1/tier-1-animation';
import '../../../al-web-components/.storybook/components/tokens/tier-1/tier-1-border';
import '../../../al-web-components/.storybook/components/tokens/tier-1/tier-1-breakpoints';
import '../../../al-web-components/.storybook/components/tokens/tier-1/tier-1-colors';
import '../../../al-web-components/.storybook/components/tokens/tier-1/tier-1-icons';
import '../../../al-web-components/.storybook/components/tokens/tier-1/tier-1-layout';
import '../../../al-web-components/.storybook/components/tokens/tier-1/tier-1-opacity';
import '../../../al-web-components/.storybook/components/tokens/tier-1/tier-1-shadows';
import '../../../al-web-components/.storybook/components/tokens/tier-1/tier-1-space';
import '../../../al-web-components/.storybook/components/tokens/tier-1/tier-1-typography';
import '../../../al-web-components/.storybook/components/tokens/tier-1/tier-1-zindex';

const meta: Meta = {
  title: 'Foundations/Tokens/Tier 1: Definitions',
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

// Story order matches the web-components file exactly.
export const Animation: Story = { render: () => <tier-1-animation /> };
export const Border: Story = { render: () => <tier-1-border /> };
export const Breakpoints: Story = { render: () => <tier-1-breakpoints /> };
export const Colors: Story = { render: () => <tier-1-colors /> };
export const Icons: Story = { render: () => <tier-1-icons /> };
export const Layout: Story = { render: () => <tier-1-layout /> };
export const Opacity: Story = { render: () => <tier-1-opacity /> };
export const Shadows: Story = { render: () => <tier-1-shadows /> };
export const Space: Story = { render: () => <tier-1-space /> };
export const Typography: Story = { render: () => <tier-1-typography /> };
export const ZIndex: Story = { render: () => <tier-1-zindex /> };
