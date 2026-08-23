/**
 * The autodocs page for every component.
 *
 * This is a near-copy of Storybook's own `DocsPage`
 * (`@storybook/addon-docs/dist/blocks.js` -> `var DocsPage = () => {...}`) with
 * exactly one change: an `<A11yReport>` is rendered directly beneath each
 * story's canvas.
 *
 * We have to fork the page rather than compose it because `<Primary />` and
 * `<Stories />` render `<DocsStory>` internally and expose no slot to inject
 * anything per story. The pieces below (`usePrimaryStory` equivalent, the
 * `componentStories()` + autodocs filter) are lifted from `Primary.tsx` and
 * `Stories.tsx` in that same bundle, so this file has to be re-checked on a
 * Storybook major upgrade. It is wired in via `preview.ts`
 * -> `parameters.docs.page`.
 *
 * Why any of this: `main.ts` turns on `docs.docsMode`, and docs entries get no
 * addon panel — see the header of `./blocks/a11y-report.tsx`.
 */
import React, { useContext } from 'react';
import {
  Title,
  Subtitle,
  Description,
  Controls,
  DocsStory,
  DocsContext,
  useOf,
} from '@storybook/addon-docs/blocks';
import { styled } from 'storybook/theming';
import type { PreparedStory } from 'storybook/internal/types';
import { A11yReport } from './blocks/a11y-report';
import { FigmaParity } from './blocks/figma-parity';

/**
 * Breaks each story preview out of the docs content measure.
 *
 * `main.ts` runs `docs.docsMode`, so the DOCS PAGE is the only view most
 * readers ever see — the sidebar has no separate canvas entry to click. But
 * Storybook caps `.sbdocs-content` at `max-width: 1000px` (plus 20px of
 * wrapper padding), and `parameters.layout: 'fullscreen'` does NOT lift that:
 * it governs the story canvas, not the docs column. So a full-bleed organism —
 * a header, a hero band, a marquee — rendered at 998px inside a 1440px
 * viewport, reading as though it had margins it does not have.
 *
 * The negative-margin breakout restores it: the content column is centred, so
 * pulling `50% - 50vw` off each side lands the preview exactly on the viewport
 * edges at any width. Prose keeps the 1000px measure, which is what it wants.
 *
 * Applied ONLY when the component's meta declares `layout: 'fullscreen'`, so
 * an Atom's preview keeps the padded, centred canvas where the inset helps.
 */
const FullBleedStories = styled.div({
  '& .sbdocs-preview': {
    marginInline: 'calc(50% - 50vw)',
    maxInlineSize: '100vw',
  },
});

/** Mirrors `StyledHeading` in Storybook's `Stories.tsx`. */
const StoriesHeading = styled.h3(({ theme }) => ({
  fontSize: `${theme.typography.size.s2 - 1}px`,
  fontWeight: theme.typography.weight.bold,
  lineHeight: '16px',
  letterSpacing: '0.35em',
  textTransform: 'uppercase',
  color: theme.textMutedColor,
  border: 0,
  margin: '56px 0 12px',
}));

/**
 * The autodocs tag Storybook filters on. Imported as a literal rather than from
 * `storybook/internal/preview-api`'s `Tag` enum so this file has one less
 * internal import to break on upgrade; the value is stable CSF vocabulary.
 */
const AUTODOCS_TAG = 'autodocs';

const useComponentStories = (): PreparedStory[] => {
  const { componentStories, projectAnnotations, getStoryContext } = useContext(DocsContext) as any;
  let stories: PreparedStory[] = componentStories();
  const filter = projectAnnotations?.parameters?.docs?.stories?.filter;
  if (filter) stories = stories.filter((s) => filter(s, getStoryContext(s)));
  // Same rule Storybook applies: once ANY story is tagged autodocs, only the
  // tagged ones are documented — and stories that call `mount()` themselves are
  // never auto-rendered.
  if (stories.some((s) => s.tags?.includes(AUTODOCS_TAG))) {
    stories = stories.filter((s) => s.tags?.includes(AUTODOCS_TAG) && !(s as any).usesMount);
  }
  return stories;
};

export const AltitudeDocsPage = () => {
  const resolvedOf = useOf('meta', ['meta']) as any;
  const stories = useComponentStories();
  const isSingleStory = Object.keys(resolvedOf.csfFile.stories).length === 1;

  const [primary, ...rest] = stories;

  // `layout` lives on the component's meta; `preparedMeta` is the resolved
  // form, with the raw CSF meta as the fallback for pages Storybook has not
  // prepared (MDX).
  const layout =
    resolvedOf?.preparedMeta?.parameters?.layout ?? resolvedOf?.csfFile?.meta?.parameters?.layout;
  const StoryWrap = layout === 'fullscreen' ? FullBleedStories : React.Fragment;

  return (
    <>
      <Title />
      <Subtitle />
      <Description of="meta" />
      {isSingleStory ? <Description of="story" /> : null}

      {/* Figma <-> code parity banner. `component` in these stories is the
          custom element TAG string ('al-button'); pages whose meta has no
          string component (Foundations/Resources MDX) render nothing. */}
      <FigmaParity tag={resolvedOf?.preparedMeta?.component ?? resolvedOf?.csfFile?.meta?.component} />

      {primary && (
        <StoryWrap>
          <DocsStory of={primary.moduleExport} expanded={false} __primary withToolbar />
          <A11yReport of={primary.moduleExport} />
        </StoryWrap>
      )}

      <Controls />

      {!isSingleStory && rest.length > 0 && (
        <>
          <StoriesHeading>Stories</StoriesHeading>
          <StoryWrap>
            {rest.map((story) => (
              <React.Fragment key={story.id}>
                <DocsStory of={story.moduleExport} expanded __forceInitialArgs />
                <A11yReport of={story.moduleExport} />
              </React.Fragment>
            ))}
          </StoryWrap>
        </>
      )}
    </>
  );
};

export default AltitudeDocsPage;
