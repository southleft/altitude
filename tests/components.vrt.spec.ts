import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * Visual regression across the whole component library.
 *
 * WHY THIS EXISTS. `pilots.vrt.spec.ts` covers five components against a
 * hand-authored fixture page — 5 of 68, with the other 63 having no visual
 * baseline at all. Scaling that fixture meant hand-authoring 63 more sections
 * and keeping them in step with the components forever, which is why it never
 * happened.
 *
 * WHAT CHANGED. The story fixture (`libs/al-web-components/story-fixture`)
 * already renders every component's stories with real Lit, because the
 * accessibility sweep needs them. Pointing VRT at the same fixture costs one
 * spec file and no new fixture to maintain — and it means the axe results and
 * the screenshots describe the SAME rendered states, rather than two fixtures
 * that drift apart and disagree about what a component looks like.
 *
 * ONE BASELINE PER COMPONENT, not per story. The fixture serves 494 states;
 * 494 screenshots would be a review burden nobody would read, and most stories
 * of one component differ in ways a diff cannot judge. The `Default` story is
 * the component as the library ships it, which is the thing worth pinning.
 *
 * Baselines land in `.altitude/baselines/screenshots/` (snapshotPathTemplate in
 * playwright.config.ts), beside the five pilots.
 *
 * THE BASELINES ARE RUNNER-RENDERED, AND CI IS AUTHORITATIVE.
 *
 * Text rasterises differently on Linux and Windows, so a baseline captured on a
 * developer machine can differ from the same render on the CI runner by enough
 * to trip `maxDiffPixelRatio: 0.01`.
 *
 * REMEASURED 2026-09-03: **all 67 of 67 fail on Windows**, not the 9 this header
 * used to name. The old figure (58 identical, 9 text-heavy outliers) is wrong,
 * and wrong in the dangerous direction — someone told to expect 9 failures, who
 * then sees 67, concludes they have broken the library. The likeliest next move
 * is a local `baselines:vrt`, which "fixes" all 67 against Windows rendering and
 * silently breaks CI for everyone else.
 *
 * The measurement: on a branch whose only visual change was two neutral stops,
 * a Windows run failed 67 unique components while the SAME commit passed all 72
 * baselines on the Linux runner. So the divergence is the platform, wholesale,
 * not a short list of text-heavy components.
 *
 * Baselines are committed AS THE RUNNER RENDERS THEM, the same way commit
 * 709f484 refreshed the five pilots "from runner-rendered actuals". State the
 * consequence plainly rather than let it be discovered: **this spec is not
 * meaningful on Windows.** Run it for a smoke check if you like, but CI is the
 * check that counts, and a local failure list proves nothing either way.
 *
 * To refresh a baseline after an intentional visual change, take it from the
 * runner rather than from your machine: the failing job uploads the `-actual`
 * PNGs as the `playwright-report` artifact, and those are the files to commit.
 * `--update-snapshots` locally will produce baselines that fail CI.
 */

// `process.cwd()` and not an `import.meta.url`-relative path: Playwright loads
// these specs as CommonJS, where `import.meta` is a syntax error. The config at
// the repo root sets the cwd for every run.
const INDEX = resolve(process.cwd(), 'libs/al-web-components/story-fixture/dist/index.json');

/**
 * One entry per component: its `Default` story, or its first if it names them
 * differently. Read from the fixture's own index so this file lists no
 * components of its own — a component added to the library is covered without
 * an edit here, which is the same rule the docs site follows.
 */
function componentEntries(): { slug: string; id: string }[] {
  let index: { entries: Record<string, { id: string; name: string; title: string }> };
  try {
    index = JSON.parse(readFileSync(INDEX, 'utf8'));
  } catch {
    throw new Error(
      `Story fixture index not found at ${INDEX}. Run \`pnpm run build:fixtures\` (or ` +
        '`pnpm run build:story-fixture`) before the visual tests.'
    );
  }

  const bySlug = new Map<string, { slug: string; id: string }>();
  for (const entry of Object.values(index.entries)) {
    const slug = entry.title;
    const existing = bySlug.get(slug);
    // `Default` wins if present; otherwise the first entry seen holds.
    if (!existing || entry.name === 'Default') {
      if (!existing || entry.name === 'Default') bySlug.set(slug, { slug, id: entry.id });
    }
  }
  return [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

const COMPONENTS = componentEntries();

test.describe('component visual baselines', () => {
  for (const { slug, id } of COMPONENTS) {
    test(`${slug} matches its baseline`, async ({ page }) => {
      await page.goto(`http://localhost:5178/iframe.html?id=${encodeURIComponent(id)}&viewMode=story`);

      const root = page.locator('#storybook-root');
      // `attached`, not `visible`. Several components render nothing with a
      // bounding box until they are interacted with (al-focus-trap, al-popover,
      // al-spinner at its smallest), so a visibility wait times out on a story
      // that mounted perfectly well — the same trap build-a11y-report.mjs
      // documents.
      await expect(root).toBeAttached();

      // The fixture sets this after two animation frames, once Lit has attached
      // every shadow root. Keying off it rather than a sleep means a slow
      // component delays the screenshot instead of producing a torn one.
      await expect(root).toHaveAttribute('data-fixture-ready', 'true');

      /*
       * A zero-HEIGHT root has nothing to pin, and Playwright cannot screenshot
       * it — the attempt times out rather than failing usefully. Two components
       * are legitimately in that state by default: `al-focus-trap` is a
       * behavioural wrapper that paints nothing, and `al-spinner`'s default
       * story renders at no height until it is activated. Both measure 1264x0.
       *
       * Detected rather than listed, so this stays true in both directions: a
       * component that becomes visual later is covered with no edit here, and
       * one that stops rendering is skipped with a reason instead of failing as
       * if its appearance had changed. The skip is STATED — a silently absent
       * baseline and a passing one look identical in a report.
       */
      const height = await root.evaluate((el) => Math.round(el.getBoundingClientRect().height));
      test.skip(
        height === 0,
        `${slug} renders at zero height in its default story, so there is nothing to pin.`
      );

      await expect(root).toHaveScreenshot(`component-${slug}.png`, {
        animations: 'disabled',
        caret: 'hide',
      });
    });
  }
});
