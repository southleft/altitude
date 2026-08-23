/**
 * `<A11yReport of={story} />` — the accessibility panel, rendered INLINE in the
 * docs page instead of in Storybook's addon panel.
 *
 * WHY THIS EXISTS
 * ---------------
 * `main.ts` sets `docs.docsMode = true`, which collapses the sidebar to one
 * node per component. Storybook renders **no addon panel for a docs entry** —
 * the panel only exists for story entries — so switching to a docs-only sidebar
 * makes the stock `@storybook/addon-a11y` tab unreachable. The addon's panel
 * also cannot simply be re-used here: it is MANAGER code (it lives in the outer
 * app, `@storybook/addon-a11y/manager`), whereas docs blocks run inside the
 * PREVIEW iframe. There is no exported docs block in the addon
 * (`@storybook/addon-a11y` exports only `./manager`, `./preview`, `./preset`).
 *
 * So this block does the one thing the panel does that we care about: run
 * axe-core against a story's rendered DOM and show what it found. axe walks
 * shadow roots natively, which is the only reason this is viable for a Lit
 * library at all.
 *
 * It deliberately does NOT reimplement the panel's "Passes / Incomplete /
 * Violations" tabs, its highlight-on-hover, or its rule-level toggles. Those
 * are debugging affordances; a docs page wants a verdict.
 *
 * PARAMETERS honoured (same shape as the addon, so nothing has to be re-declared
 * per story):
 *   parameters.a11y.disable === true   -> render nothing
 *   parameters.a11y.test === 'off'     -> render nothing
 *   parameters.a11y.options            -> passed straight to `axe.run`
 *   parameters.a11y.config             -> passed to `axe.configure`
 * `parameters.a11y.context` is intentionally NOT honoured: the context here is
 * always this story's own block element, which is narrower than any selector a
 * story could supply and avoids one story auditing another's DOM.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useOf } from '@storybook/addon-docs/blocks';
import { styled } from 'storybook/theming';
import type { ModuleExport } from 'storybook/internal/types';
import type { AxeResults, Result, Spec, RunOptions } from 'axe-core';

type Status = 'idle' | 'running' | 'done' | 'error';

interface A11yStoryParameters {
  disable?: boolean;
  test?: 'off' | 'todo' | 'error';
  options?: RunOptions;
  config?: Spec;
}

/**
 * The DOM id `@storybook/addon-docs` gives a story block, from
 * `storyBlockIdFromId` in its `Story.tsx`: `story--${id}` — plus a `--primary`
 * suffix for the story rendered by `<Primary />`. We do not know which of the
 * two we are next to, so try both.
 */
const storyBlockIds = (storyId: string) => [`story--${storyId}--primary`, `story--${storyId}`];

/**
 * SERIALISED axe runs. THIS IS LOAD-BEARING — do not call `axe.run` directly.
 *
 * axe-core is a stateful singleton with ONE global run lock: a second
 * `axe.run()` started before the first resolves throws "Axe is already running."
 * A docs page mounts one `<A11yReport>` per story (28 of them on
 * `Atoms/Button`), and they all finish waiting for their canvas on the same
 * `requestAnimationFrame` tick — so without this queue exactly one story reports
 * a real result and every other bar shows that error permanently. Measured, not
 * theorised: 27 of 28 bars on the Button page.
 *
 * `.then(fn, fn)` rather than `.then(fn)` so one story's failure does not
 * cancel every story queued behind it.
 */
/**
 * Rules switched OFF by default here, and ONLY here — they are document-scoped,
 * and a docs page is a document containing N copies of the same component.
 *
 * Concretely: `Organisms/Header` renders two stories, so the page has two
 * `<header>` elements, so `landmark-no-duplicate-banner` fires — reporting a
 * defect in the PAGE, not in the component. Same for duplicate ids across two
 * instances of one story, or "no main landmark" on a page that is documentation
 * rather than an app.
 *
 * The stock addon panel never hits this because it audits one story per page.
 * We audit N, so we have to drop the rules that only make sense once per
 * document. A story can switch any of them back on with
 * `parameters.a11y.options.rules`, which is merged AFTER this.
 */
const DOCUMENT_SCOPED_RULES = [
  'landmark-no-duplicate-banner',
  'landmark-no-duplicate-contentinfo',
  'landmark-no-duplicate-main',
  'landmark-one-main',
  'landmark-unique',
  'region',
  'page-has-heading-one',
  'duplicate-id-aria',
] as const;

const defaultRules = Object.fromEntries(DOCUMENT_SCOPED_RULES.map((id) => [id, { enabled: false }]));

let axeChain: Promise<unknown> = Promise.resolve();
function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const result = axeChain.then(fn, fn);
  // Park the rejection so the shared chain never surfaces an unhandled one; the
  // caller still gets the real error from `result`.
  axeChain = result.catch(() => undefined);
  return result;
}

/**
 * Wait for the story block to exist AND to have painted something. Docs pages
 * render stories lazily/asynchronously, and a Lit element needs at least one
 * microtask past `connectedCallback` before its shadow root has content — so
 * polling on a frame budget is more reliable here than any single event.
 * Resolves `null` if the element never shows up (e.g. the story errored).
 */
function waitForStoryEl(storyId: string, timeoutMs = 15000): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const started = performance.now();
    const tick = () => {
      for (const id of storyBlockIds(storyId)) {
        const el = document.getElementById(id);
        // `childElementCount` guards the window where the block exists but the
        // story has not been rendered into it yet — auditing that empty div
        // would report a clean pass for a story that never ran.
        if (el && el.childElementCount > 0) {
          resolve(el);
          return;
        }
      }
      if (performance.now() - started > timeoutMs) {
        resolve(null);
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

const Wrapper = styled.div(({ theme }) => ({
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: theme.appBorderRadius,
  borderTopLeftRadius: 0,
  borderTopRightRadius: 0,
  borderTop: 0,
  // Pull up under the Canvas block, which owns the rounded top corners.
  margin: '-17px 0 25px 0',
  background: theme.background.app,
  fontSize: theme.typography.size.s2 - 1,
  fontFamily: theme.typography.fonts.base,
  color: theme.color.defaultText,
  overflow: 'hidden',
}));

const SummaryBar = styled.button<{ tone: 'pass' | 'fail' | 'muted' }>(({ theme, tone }) => ({
  all: 'unset',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '8px 14px',
  cursor: tone === 'fail' ? 'pointer' : 'default',
  fontWeight: theme.typography.weight.bold,
  color: tone === 'fail' ? theme.color.negativeText : tone === 'pass' ? theme.color.positiveText : theme.textMutedColor,
}));

const Dot = styled.span<{ tone: 'pass' | 'fail' | 'muted' }>(({ theme, tone }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  flex: 'none',
  background: tone === 'fail' ? theme.color.negative : tone === 'pass' ? theme.color.positive : theme.color.mediumdark,
}));

const List = styled.ul(({ theme }) => ({
  listStyle: 'none',
  margin: 0,
  padding: '0 14px 12px',
  borderTop: `1px solid ${theme.appBorderColor}`,
  paddingTop: 12,
}));

const Item = styled.li(({ theme }) => ({
  margin: '0 0 12px 0',
  '&:last-child': { marginBottom: 0 },
  '& code': {
    fontFamily: theme.typography.fonts.mono,
    fontSize: theme.typography.size.s1,
    background: theme.background.hoverable,
    borderRadius: 3,
    padding: '1px 4px',
  },
}));

const Impact = styled.span<{ impact?: string | null }>(({ theme, impact }) => ({
  display: 'inline-block',
  fontSize: theme.typography.size.s1 - 1,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: theme.typography.weight.bold,
  padding: '1px 6px',
  borderRadius: 3,
  marginRight: 8,
  color: theme.color.lightest,
  background: impact === 'critical' || impact === 'serious' ? theme.color.negative : theme.color.warning,
}));

const Targets = styled.div(({ theme }) => ({
  color: theme.textMutedColor,
  fontFamily: theme.typography.fonts.mono,
  fontSize: theme.typography.size.s1 - 1,
  marginTop: 4,
  wordBreak: 'break-all',
}));

export interface A11yReportProps {
  /** The story to audit — pass the module export, exactly like `<Canvas of={} />`. */
  of: ModuleExport;
}

export const A11yReport = ({ of }: A11yReportProps) => {
  const resolved = useOf(of, ['story']);
  const story = resolved.type === 'story' ? resolved.story : undefined;
  const storyId = story?.id;
  const params = ((story?.parameters?.a11y ?? {}) as A11yStoryParameters) || {};

  const [status, setStatus] = useState<Status>('idle');
  const [violations, setViolations] = useState<Result[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const cancelled = useRef(false);

  const off = params.disable === true || params.test === 'off';

  // NOTE: there is deliberately NO IntersectionObserver lazy-run here. An
  // earlier version gated each run on the block scrolling into view, to avoid
  // queueing 28 axe passes on load. It never fired: the emotion `styled.div`
  // below does not forward a ref to the DOM node, so the observer was never
  // attached and every bar sat on "pending" forever. The queue above is what
  // makes this correct; running eagerly just means the page settles a few
  // seconds after load, which is fine for a docs page.

  useEffect(() => {
    cancelled.current = false;
    if (!storyId || off) return undefined;

    setStatus('running');
    (async () => {
      try {
        // Dynamic import: axe is ~550 KB of parsed JS. Loading it statically
        // would put it in the docs entry chunk for every page, including the
        // ones that never render a story.
        //
        // `axe-core` ships as a UMD bundle with no `module` field, so what
        // Vite's interop puts on `.default` is not guaranteed — fall back to
        // the namespace object itself rather than calling `undefined.run`.
        const mod: any = await import('axe-core');
        const axe = mod?.default?.run ? mod.default : mod;
        if (typeof axe?.run !== 'function') {
          throw new Error('axe-core loaded but exposes no run()');
        }

        const el = await waitForStoryEl(storyId);
        if (cancelled.current) return;
        if (!el) {
          throw new Error(`story canvas for "${storyId}" never rendered`);
        }

        // Wait for the canvas OUTSIDE the lock — polling for up to 15s while
        // holding it would stall every other story on the page behind us.
        const results: AxeResults = await runExclusive(() => {
          if (params.config) axe.configure(params.config);
          return axe.run(el, {
            // `resultTypes: ['violations']` tells axe to stop collecting node
            // detail for passes/incomplete, which is the bulk of the work.
            resultTypes: ['violations'],
            ...(params.options ?? {}),
            // Story params win per-rule, but the document-scoped defaults still
            // apply to any rule the story does not name.
            rules: { ...defaultRules, ...(params.options?.rules ?? {}) },
          });
        });
        if (cancelled.current) return;
        setViolations(results.violations);
        setStatus('done');
      } catch (err) {
        if (cancelled.current) return;
        // Surface the reason. Swallowing it here once cost a debugging round
        // trip: "could not run" is indistinguishable from a dozen causes.
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setStatus('error');
      }
    })();

    return () => {
      cancelled.current = true;
    };
    // `params` is re-created each render; key off the story instead.
  }, [storyId, off]);

  if (!storyId || off) return null;

  if (status === 'running' || status === 'idle') {
    return (
      <Wrapper>
        <SummaryBar as="div" tone="muted">
          <Dot tone="muted" />
          Checking accessibility…
        </SummaryBar>
      </Wrapper>
    );
  }

  if (status === 'error') {
    return (
      <Wrapper>
        <SummaryBar as="div" tone="muted">
          <Dot tone="muted" />
          Accessibility check could not run — {errorMsg || 'unknown error'}
        </SummaryBar>
      </Wrapper>
    );
  }

  if (violations.length === 0) {
    return (
      <Wrapper>
        <SummaryBar as="div" tone="pass">
          <Dot tone="pass" />
          No accessibility violations
        </SummaryBar>
      </Wrapper>
    );
  }

  const count = violations.length;
  return (
    <Wrapper>
      <SummaryBar tone="fail" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
        <Dot tone="fail" />
        {count} accessibility violation{count === 1 ? '' : 's'}
        <span style={{ fontWeight: 400, opacity: 0.8 }}>{expanded ? '— hide' : '— show'}</span>
      </SummaryBar>
      {expanded && (
        <List>
          {violations.map((v) => (
            <Item key={v.id}>
              <div>
                <Impact impact={v.impact}>{v.impact ?? 'minor'}</Impact>
                {v.help} <code>{v.id}</code>{' '}
                <a href={v.helpUrl} target="_blank" rel="noreferrer">
                  learn more
                </a>
              </div>
              <Targets>{v.nodes.map((n) => n.target.join(' ')).join('  •  ')}</Targets>
            </Item>
          ))}
        </List>
      )}
    </Wrapper>
  );
};
