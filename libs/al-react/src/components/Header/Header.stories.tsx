// `<ALHeader>` stories. Kept deliberately in sync with the web-component Header
// stories (`libs/al-web-components/components/header/header.stories.ts`).
import type { StoryObj } from '@storybook/react-vite';
import { ALButton, ALHeader, ALLayout, ALLink, ALLogo } from '../..';
import { placeholderImages } from '../../../../al-web-components/.storybook/fixtures';

export default {
  title: 'Organisms/Header',
  component: ALHeader,
  parameters: { status: { type: 'beta' }, layout: 'fullscreen' },
};

/**
 * The header owns the `<header>` landmark and the bar chrome — surface, minimum
 * height, and the opt-in `sticky` / `elevated` behaviour. It takes no position on
 * what sits where: nest an `<ALLayout>` and arrange there.
 */
export const Default: StoryObj<typeof ALHeader> = {
  args: {
    elevated: true,
    children: (
      <ALLayout direction="row" align="center" justify="between">
        <span>Start</span>
        <span>Middle</span>
        <span>End</span>
      </ALLayout>
    ),
  },
};

/**
 * A wordmark, a nav, and an action cluster on one row. The nav takes the free
 * space via `grow`; the other two size to their content.
 */
export const BrandNavActions: StoryObj<typeof ALHeader> = {
  args: {
    sticky: true,
    elevated: true,
    children: (
      <ALLayout direction="row" align="center" gap="lg">
        <ALLogo variant="southleft" />
        <ALLayout direction="row" align="center" gap="md" grow>
          <ALLink href="#">Product</ALLink>
          <ALLink href="#">Solutions</ALLink>
          <ALLink href="#">Developers</ALLink>
          <ALLink href="#">Pricing</ALLink>
          <ALLink href="#">Docs</ALLink>
          <ALLink href="#">Company</ALLink>
        </ALLayout>
        <ALLayout direction="row" align="center" gap="sm">
          <ALButton variant="tertiary">Sign in</ALButton>
          <ALButton>Get started</ALButton>
        </ALLayout>
      </ALLayout>
    ),
  },
};

/** A brand mark is sized by the page — the header imposes no cap. */
export const WithImageLogo: StoryObj<typeof ALHeader> = {
  args: {
    children: (
      <ALLayout direction="row" align="center" justify="between">
        <img src={placeholderImages.logo} alt="Acme" width={160} height={40} />
        <ALButton variant="tertiary">Menu</ALButton>
      </ALLayout>
    ),
  },
};

/**
 * Plain by default. Without `sticky` and `elevated` the header is an in-flow
 * landmark, usable for an embedded or in-page header.
 */
export const Plain: StoryObj<typeof ALHeader> = {
  args: {
    children: (
      <ALLayout direction="row" align="center" justify="between">
        <ALLogo variant="southleft" />
        <ALButton variant="tertiary">Sign in</ALButton>
      </ALLayout>
    ),
  },
};
