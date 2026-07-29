import { useContext } from 'react';
import { Canvas, Controls, DocsContext, Unstyled, useOf } from '@storybook/addon-docs/blocks';

/**
 * Altitude autodocs page.
 *
 * Replaces Storybook's stock DocsPage with the layout from the Altitude
 * showcase design: breadcrumb + atomic-level badge, display title, description,
 * a story count, then every story as a bordered card whose header carries the
 * story name on the left and its addressable story id on the right.
 *
 * WHY THIS IS REACT IN A LIT PROJECT
 * `parameters.docs.page` is typed `ComponentType` and is invoked by addon-docs
 * as `React.createElement(Page)`. There is no renderer-agnostic escape hatch, so
 * a custom docs page is React regardless of the framework the stories use. The
 * stories themselves are still Lit — only this page shell is React.
 *
 * MDX IS UNAFFECTED
 * The five attached `.mdx` files use `<Meta of={Stories} />`, which replaces the
 * autodocs entry for their CSF file outright. `docs.page` only supplies the
 * *autodocs* page, so those keep rendering their own content.
 */

/** Title segments that encode an atomic level in the current IA. */
const LEVEL_FROM_TITLE: Record<string, string> = {
  atoms: 'Atom',
  molecules: 'Molecule',
  organisms: 'Organism',
  templates: 'Template',
  pages: 'Page',
  foundations: 'Foundation',
  resources: 'Resource',
};

/** Explicit atomic-level tags, once stories start carrying them. */
const LEVEL_FROM_TAG: Record<string, string> = {
  atom: 'Atom',
  molecule: 'Molecule',
  organism: 'Organism',
  template: 'Template',
  page: 'Page',
};

const levelFor = (title: string, tags: string[] = []): string | null => {
  for (const tag of tags) {
    if (LEVEL_FROM_TAG[tag]) return LEVEL_FROM_TAG[tag];
  }
  // Fall back to the first title segment. The IA still encodes the atomic level
  // in the title today; when titles move to functional groups this keeps
  // working only for the tagged path, which is the intended end state.
  const root = title.split('/')[0]?.trim().toLowerCase();
  return (root && LEVEL_FROM_TITLE[root]) || null;
};

/**
 * Resolves the component blurb the same way Storybook's own `<Description of="meta" />`
 * does: the explicit `docs.description.component` parameter first, then the
 * renderer's docgen extractor — which for web-components reads the CEM wired up
 * by `setCustomElementsManifest` in preview.ts.
 *
 * We resolve it to a string rather than rendering the block so the boilerplate
 * below can be filtered out.
 */
const descriptionFrom = (preparedMeta: any): string | undefined => {
  const parameters = preparedMeta?.parameters;
  const explicit = parameters?.docs?.description?.component;
  if (explicit) return explicit;

  const extract = parameters?.docs?.extractComponentDescription;
  if (typeof extract !== 'function') return undefined;

  const component = preparedMeta?.component;
  try {
    return extract(component, { component, parameters }) || undefined;
  } catch {
    return undefined;
  }
};

/**
 * The CEM currently yields boilerplate like `Component: al-divider`, sometimes
 * followed by slot bullets. Neither is a description, and rendering them as the
 * page lede looks broken. Strip both; if nothing meaningful survives we render
 * no description at all, which is honest — and creates the right pressure to
 * author real ones as JSDoc on the component classes.
 */
const cleanDescription = (raw?: string): string | undefined => {
  if (!raw) return undefined;
  const kept = raw
    .split('\n')
    .map((line) => line.trim())
    // The tag-name prefix is matched loosely (`\w`, not `al-`) on purpose:
    // at least one component's JSDoc has a typo — `Component: el-spinner` —
    // and an `al-`-anchored pattern would leak that line into the page lede.
    .filter((line) => line && !/^(Component|Icon):\s*[\w-]+$/i.test(line) && !line.startsWith('-'))
    .join(' ')
    .trim();
  return kept || undefined;
};

export const AltitudeDocsPage = () => {
  const context = useContext(DocsContext) as any;
  const { preparedMeta } = (useOf('meta', ['meta']) as any) ?? {};

  // `componentStories()` is the supported way to enumerate the stories attached
  // to this docs page, in declaration order.
  const stories: any[] = typeof context?.componentStories === 'function' ? context.componentStories() : [];

  // Mirrors addon-docs' internal `usePrimaryStory`, which is not exported:
  // on an autodocs page the primary is the first autodocs-tagged story.
  const primary =
    (context?.filterByAutodocs === false
      ? stories[0]
      : stories.find((story) => story?.tags?.includes('autodocs'))) ?? stories[0];

  const title: string = preparedMeta?.title ?? primary?.title ?? '';
  const segments = title.split('/').filter(Boolean);
  const componentName = segments[segments.length - 1] ?? 'Component';
  const level = levelFor(title, preparedMeta?.tags ?? primary?.tags ?? []);

  const description = cleanDescription(descriptionFrom(preparedMeta));

  const countLabel = stories.length === 1 ? '1 story' : `${stories.length} stories`;

  return (
    <Unstyled>
      <div className="al-docs">
        <header className="al-docs__header">
          <div className="al-docs__eyebrow">
            <span className="al-docs__crumb">{segments.join(' / ')}</span>
            {level && <span className="al-docs__level">{level}</span>}
          </div>

          <h1 className="al-docs__title">{componentName}</h1>

          {description && <p className="al-docs__description">{description}</p>}

          <div className="al-docs__count">{countLabel}</div>
        </header>

        <div className="al-docs__stories">
          {stories.map((story) => (
            <section className="al-docs__card" key={story.id}>
              <div className="al-docs__card-head">
                <span className="al-docs__card-name">{story.name}</span>
                <span className="al-docs__card-id">{story.id}</span>
              </div>
              <Canvas of={story.moduleExport} />
            </section>
          ))}
        </div>

        {primary && (
          <div className="al-docs__args">
            <div className="al-docs__section-label">Properties</div>
            <Controls of={primary.moduleExport} />
          </div>
        )}
      </div>
    </Unstyled>
  );
};

export default AltitudeDocsPage;
