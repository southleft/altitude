// `<ALFooter>` stories. Kept deliberately in sync with the web-component Footer
// stories (`libs/al-web-components/components/footer/footer.stories.ts`).
import type { StoryObj } from '@storybook/react-vite';
import { ALDivider, ALFooter, ALHeading, ALLayout, ALLink, ALList, ALListItem, ALLogo } from '../..';
import { placeholderImages } from '../../../../al-web-components/fixtures';

export default {
  title: 'Organisms/Footer',
  component: ALFooter,
  parameters: {
    status: { type: 'beta' },
    // `padded`, not `fullscreen` — the footer carries no inline padding of its
    // own, so a fullscreen story renders it edge-to-edge and reads as broken.
    layout: 'padded'
  }
};

/** One link column. Reused across the stories so they stay about the FOOTER. */
const Column = ({ heading, links }: { heading: string; links: string[] }) => (
  <ALLayout direction="column" gap="sm">
    <ALHeading tagName="h3" variant="sm" isBold>
      {heading}
    </ALHeading>
    <ALList>
      {links.map((l) => (
        <ALListItem key={l}>
          <ALLink href="#">{l}</ALLink>
        </ALListItem>
      ))}
    </ALList>
  </ALLayout>
);

/**
 * The footer owns the `<footer>` landmark, its block padding and the gap between
 * stacked rows. Everything else is composition — including the rule between the
 * rows, which is an `<ALDivider>` rather than a border the component draws.
 */
export const Default: StoryObj<typeof ALFooter> = {
  render: (args) => (
    <ALFooter {...args}>
      <ALLayout direction="row" justify="between" wrap gap="xl">
        <ALLogo variant="southleft" />
        <ALLayout direction="row" align="start" wrap gap="xl">
          <Column heading="Product" links={['Features', 'Pricing', 'Changelog']} />
          <Column heading="Company" links={['About', 'Careers', 'Contact']} />
          <Column heading="Resources" links={['Docs', 'Support']} />
        </ALLayout>
      </ALLayout>

      <ALDivider />

      <ALLayout direction="row" justify="between" align="center" wrap gap="sm">
        <ALLayout direction="row" align="center" wrap gap="sm">
          <span>&copy; 2026 Altitude. All rights reserved.</span>
          <ALLink href="#">Privacy</ALLink>
          <ALLink href="#">Terms</ALLink>
        </ALLayout>
        <ALLayout direction="row" align="center" gap="sm">
          <ALLink href="#">X</ALLink>
          <ALLink href="#">LinkedIn</ALLink>
        </ALLayout>
      </ALLayout>
    </ALFooter>
  )
};

/**
 * Legal copy above the links, centred, with no divider.
 */
export const CentredStack: StoryObj<typeof ALFooter> = {
  render: (args) => (
    <ALFooter {...args}>
      <ALLayout direction="column" align="center" gap="md">
        <ALLogo variant="southleft" />
        <ALLayout direction="row" justify="center" wrap gap="md">
          <ALLink href="#">Features</ALLink>
          <ALLink href="#">Pricing</ALLink>
          <ALLink href="#">Docs</ALLink>
          <ALLink href="#">Support</ALLink>
        </ALLayout>
        <span>&copy; 2026 Altitude. All rights reserved.</span>
      </ALLayout>
    </ALFooter>
  )
};

/** Link columns and nothing else. */
export const LinksOnly: StoryObj<typeof ALFooter> = {
  render: (args) => (
    <ALFooter {...args}>
      <ALLayout direction="row" align="start" wrap gap="xl">
        <Column heading="Product" links={['Features', 'Pricing']} />
        <Column heading="Company" links={['About', 'Careers']} />
      </ALLayout>
    </ALFooter>
  )
};

/** A brand mark is sized by the page — the footer imposes no cap. */
export const WithImageLogo: StoryObj<typeof ALFooter> = {
  render: (args) => (
    <ALFooter {...args}>
      <ALLayout direction="row" justify="between" wrap gap="xl">
        <img src={placeholderImages.logo} alt="Acme" width={160} height={40} />
        <ALLayout direction="row" align="start" wrap gap="xl">
          <Column heading="Product" links={['Features', 'Pricing']} />
        </ALLayout>
      </ALLayout>
      <ALDivider />
      <span>&copy; 2026 Altitude. All rights reserved.</span>
    </ALFooter>
  )
};
