/**
 * Render one story into `#storybook-root`, chosen by the query string.
 *
 * `?id=<slug>--<Story>` renders exactly that story — the form every entry in
 * `index.json` uses, and the one the accessibility sweep requests. A bare
 * `?id=<slug>` still renders that file's whole set, which is useful by hand.
 *
 * ONE STORY PER PAGE, deliberately. Stacking a file's variants into a single
 * root was tried first because it cut the sweep from 494 page visits to 67. It
 * measured the wrong thing: a floating `al-dropdown-panel` renders over an
 * unrelated variant, and axe computes contrast against whatever it overlaps.
 * That run reported 30 contrast-failing components to the Storybook run's 18,
 * `dropdown-panel` alone accounting for 26 failing nodes — layout artefacts,
 * not defects. Isolation is what makes the numbers mean anything.
 */
import { html, render, type TemplateResult } from 'lit';
import { ALTheme } from '../../components/theme/theme';
import { DEFAULT_PRESET_ID, getPreset } from '../../theme-presets';

/*
 * THEME WRAPPER — fidelity, not decoration.
 *
 * Storybook wraps every story in `<al-theme>` via `.storybook/with-preset.ts`.
 * Without it, components resolve against the base `:root` bundle instead of the
 * brand's scoped `:host([brand])` block — DIFFERENT TOKEN VALUES, and therefore
 * different colours. Measured: the first run of this fixture reported 10
 * contrast failures against the Storybook run's 18, purely because the stories
 * were rendering unthemed. An accessibility report that measures the wrong
 * palette is worse than none, so the wrapper is mandatory here.
 *
 * THE MODE MUST BE DARK. `.storybook/presets.ts` sets
 * `DEFAULT_PRESET_ID = DARK_PRESET_ID`, so every committed accessibility number
 * was measured against altitude-DARK. `PRESETS[0]` is light and looks like the
 * default — it is not; it is only the first entry of the toggle pair. Measuring
 * light here produced 23 contrast-failing components against the Storybook
 * run's 18, and the five extras were real failures **in light mode** rather
 * than fixture bugs (`al-link`'s #4375ff on the light surface is 3.07:1, well
 * under AA). Worth fixing on its own merits, but it is not what this fixture is
 * for: the job is to reproduce the existing baseline exactly, so that switching
 * away from Storybook does not silently rewrite the project's history.
 *
 * Defined unconditionally for the same reason with-preset.ts does: if
 * `alAutoRegistry` were ever unset before `theme.ts` evaluates, it silently
 * declines to register and every axis dies without an error.
 */
if (customElements.get(ALTheme.el) === undefined) {
  customElements.define(ALTheme.el, ALTheme);
}

/*
 * Read from `theme-presets.ts`, not hardcoded. `DEFAULT_PRESET_ID` is what every
 * committed accessibility number was measured under, so deriving it here means
 * the two cannot drift: change the default and the sweep follows, rather than
 * this file quietly continuing to measure the old one.
 */
const { brand: BRAND, mode: MODE } = getPreset(DEFAULT_PRESET_ID);

/* Every story module, eagerly — this page exists to render all of them. */
const modules = import.meta.glob('../../components/*/*.stories.ts', { eager: true }) as Record<
  string,
  Record<string, unknown>
>;

/** `../../components/button/button.stories.ts` -> `button` */
const slugOf = (path: string) => path.match(/components\/([a-z0-9-]+)\//)?.[1] ?? path;

type Story = { render: (args: unknown, context: unknown) => unknown; args: Record<string, unknown> };

/**
 * THREE STORY SHAPES, all of them live in this repo — the same normalisation
 * `apps/docs/src/lib/examples.mjs` performs, and for the same reason:
 *
 *   CSF3            `export const X = { args, render(args) }`
 *   CSF3 inheriting `export const X = { args }` with `render` on the default export
 *   CSF2            `const T = (args) => html\`…\`; export const X = T.bind({})`
 *                   — the story IS the render function and `.render` is absent.
 *
 * Keying off `.render` alone silently skipped 23 base components there. Same
 * trap here, so the same three branches.
 */
function normalize(value: unknown, meta: Record<string, unknown>): Story | null {
  if (typeof value === 'function') {
    /*
     * `meta.args` MUST be merged here, not just in the CSF3 branch below.
     * A CSF2 story sets only what it overrides — `Disabled.args = { isDisabled:
     * true }` — and inherits label, placeholder and fieldNote from the default
     * export. Dropping them renders a stripped-down component that looks
     * plausible and is missing the very elements the sweep needs to see: the
     * disabled `al-field-note` inside `al-select` is the node axe flags at
     * 2.4:1, and without meta args it never renders at all. That single
     * omission cost 8 form components their contrast findings.
     */
    return {
      render: value as Story['render'],
      args: {
        ...((meta.args as Record<string, unknown>) ?? {}),
        ...((value as { args?: Record<string, unknown> }).args ?? {}),
      },
    };
  }
  if (value && typeof value === 'object') {
    const own = (value as { render?: unknown }).render;
    const fn = typeof own === 'function' ? own : meta.render;
    if (typeof fn === 'function') {
      return {
        render: fn as Story['render'],
        args: {
          ...((meta.args as Record<string, unknown>) ?? {}),
          ...(((value as { args?: Record<string, unknown> }).args) ?? {}),
        },
      };
    }
  }
  return null;
}

function storiesOf(mod: Record<string, unknown>): [string, Story][] {
  const meta = (mod.default as Record<string, unknown>) ?? {};
  return Object.entries(mod)
    .filter(([name]) => name !== 'default' && !name.startsWith('__'))
    .map(([name, value]) => [name, normalize(value, meta)] as [string, Story | null])
    .filter((entry): entry is [string, Story] => entry[1] !== null);
}

const SURFACE_TOKENS = [
  // `--al-theme-color-body-background` aliases the weak background token, so
  // repointing the alias target moves the painted surface with it.
  '--al-theme-color-background-default-weak',
  '--al-theme-color-content-default',
];

function syncSurface(): void {
  const themed = root.querySelector('al-theme');
  if (!themed) return;
  const computed = getComputedStyle(themed);
  for (const token of SURFACE_TOKENS) {
    const value = computed.getPropertyValue(token).trim();
    if (value) document.documentElement.style.setProperty(token, value);
  }
}

const params = new URLSearchParams(window.location.search);
const requested = params.get('id') ?? '';
const [wantedSlug, wantedStory] = requested.split('--');

const root = document.querySelector('#storybook-root');
if (!root) throw new Error('[story-fixture] #storybook-root is missing from iframe.html');

const entry = Object.entries(modules).find(([path]) => slugOf(path) === wantedSlug);

if (!entry) {
  /*
   * Rendered, not thrown. The sweep records a story it cannot load as an
   * ERROR on that component; a blank page would instead read as "measured,
   * nothing wrong", which is the one outcome an accessibility report must
   * never produce by accident.
   */
  render(
    html`<p data-fixture-error>No story file for id "${requested || '(none)'}".</p>`,
    root,
  );
} else {
  const [path, mod] = entry;
  const all = storiesOf(mod);
  const selected = wantedStory ? all.filter(([name]) => name === wantedStory) : all;

  if (!selected.length) {
    render(
      html`<p data-fixture-error>
        Story file ${path} exports no renderable story${wantedStory ? ` named "${wantedStory}"` : ''}.
      </p>`,
      root,
    );
  } else {
    const parts: TemplateResult[] = [];
    for (const [name, story] of selected) {
      let output: unknown;
      try {
        output = story.render(story.args, { args: story.args });
      } catch (error) {
        // One story throwing must not cost the sweep the other variants in the
        // same file, so the failure is rendered in place and the loop goes on.
        parts.push(
          html`<div data-story=${name} data-story-error>
            ${name} failed to render: ${(error as Error).message}
          </div>`,
        );
        continue;
      }
      parts.push(html`<div data-story=${name}>${output as TemplateResult}</div>`);
    }
    render(html`<al-theme brand=${BRAND} mode=${MODE}>${parts}</al-theme>`, root);
    /*
     * Synchronously, not in the rAF chain below. The sweep runs axe after its
     * own two animation frames, so a repaint scheduled for the same tick is a
     * RACE — lose it and that story is measured light-on-dark. Five components
     * (footer, link, list-item, stat, text-block) reported phantom contrast
     * failures on exactly that race. `getComputedStyle` forces layout, and the
     * theme element is already upgraded at module scope, so there is nothing
     * to wait for.
     */
    syncSurface();
  }
}

/*
 * REPAINT THE PAGE SURFACE to match the wrapper — the same affordance
 * `.storybook/with-preset.ts` provides, and required for the same reason.
 *
 * `<al-theme>` is `display: contents`: it RESOLVES tokens but paints nothing.
 * The page's own background comes from `main.scss`'s `:root` bundle, which is
 * altitude-DARK and does not move when the wrapper says `mode="light"`. Leave
 * it and every story renders light-on-dark — which axe faithfully reports as a
 * contrast failure. Measured: 30 contrast-failing components against the
 * Storybook run's 18, with 13 of the extras being nothing but this.
 *
 * Copying the two surface tokens the theme element already computed keeps it
 * honest: no hardcoded colours, and the page cannot disagree with the wrapper.
 */

/*
 * Tell the sweep the page has settled. It already waits two animation frames
 * after load, which is enough for Lit to attach shadow roots; this attribute
 * is the explicit signal, so a future timing change has something to key off
 * that is not a guess about frame counts.
 */
requestAnimationFrame(() =>
  requestAnimationFrame(() => {
    syncSurface();
    root.setAttribute('data-fixture-ready', 'true');
  }),
);
