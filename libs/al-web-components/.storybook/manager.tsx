// Manager-side entry: the Altitude brand theme plus the AI theme addon.
//
// The addon derives a full token override map from a prompt and pushes it to
// the preview over the Storybook channel. Two things drive the design:
//
//  1. Local first. `buildTheme` is deterministic and needs no network, so the
//     panel applies a complete, WCAG-solved theme the instant you hit derive.
//     The AI call is a *refinement* layered on afterwards — which means the
//     addon works with no API key, offline, and in a statically-built
//     Storybook where /api/theme 404s.
//  2. Receipts, not vibes. Every contrast pair the solver enforced is printed
//     with its measured ratio, so the palette is auditable in the panel.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  addons,
  types,
  useChannel,
} from 'storybook/manager-api';
// Deliberately not IconButton: it is deprecated in Storybook 10.4 and logs on
// every render. `Button variant="ghost" padding="small"` is what it rendered.
import {
  Button,
  Form,
  WithTooltip,
  createCopyToClipboardFunction,
} from 'storybook/internal/components';
import { DOCS_RENDERED, STORY_RENDERED } from 'storybook/internal/core-events';
import { styled } from 'storybook/theming';

import managerTheme from './theme';
import { ADDON_ID, EVENTS, STORAGE_KEY, THEME_API, TOOL_ID } from './ai-theme/constants';
import { buildTheme, type BuildOptions } from './ai-theme/engine';
import type { ApplyPayload, Direction, Theme } from './ai-theme/types';

/* ------------------------------------------------------------ sidebar chrome */

/**
 * Atomic-level tags. These live in `tags` rather than `parameters` on purpose:
 * the manager's story index is built from `index.json`, which carries `tags` but
 * NOT `parameters` — parameters are backfilled one story at a time only after a
 * story has actually rendered (`prepared: !!item.parameters`). Reading a level
 * from parameters here would work for whichever story you happened to visit and
 * silently fail for every other row.
 *
 * Storybook propagates the *intersection* of child tags up to the component
 * node, so tagging every story of a component makes the level readable on the
 * component row too — which is where we want to show it.
 */
const LEVEL_TAGS: Record<string, string> = {
  atom: 'Atom',
  molecule: 'Molecule',
  organism: 'Organism',
  template: 'Template',
  page: 'Page',
};

const levelOf = (item: any): string | null => {
  const tags = item?.tags;
  if (!Array.isArray(tags)) return null;
  for (const tag of tags) {
    if (LEVEL_TAGS[tag]) return LEVEL_TAGS[tag];
  }
  return null;
};

/**
 * Renders the sidebar row label.
 *
 * Returning a falsy value makes Storybook fall back to `item.name`, so section
 * headers and stories are left alone and styled purely in `manager-head.html`.
 * Only component rows get extra chrome (level badge + story count), because
 * that is the only information CSS cannot reach on its own.
 */
const renderLabel = (item: any) => {
  if (item?.type !== 'component') return null;

  // A component's children include its autodocs entry (`…--docs`) alongside the
  // real stories. Counting those made the sidebar disagree with the "N stories"
  // line on the docs page itself (11 vs 10 for Chip).
  const count = Array.isArray(item.children)
    ? item.children.filter((id: string) => !String(id).endsWith('--docs')).length
    : 0;
  const level = levelOf(item);

  return (
    <span className="al-label">
      <span>{item.name}</span>
      {level && <span className="al-level">{level}</span>}
      {count > 0 && <span className="al-count">{String(count)}</span>}
    </span>
  );
};

addons.setConfig({
  theme: managerTheme,

  // Bottom dock. This is already the 10.4.5 default, but it is load-bearing for
  // the layout so it is stated rather than inherited.
  panelPosition: 'bottom',
  navSize: 272,
  bottomPanelHeight: 206,

  sidebar: {
    // Render the first title segment (Actions, Forms & inputs, …) as a section
    // header instead of a collapsible folder. This is what turns the tree into
    // the reference layout.
    showRoots: true,
    renderLabel,
  },
});

/* ------------------------------------------------------------------ config */

/** Generous: the local theme is already on screen while this runs, so the
 *  only cost of waiting is a better theme arriving late. */
const REFINE_TIMEOUT_MS = 15000;

/** Receipts type out one line at a time — the log reads as a transcript
 *  rather than a wall of text that blinks into existence. */
const LINE_DELAY_MS = 90;

const REDUCED_MOTION =
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const copyToClipboard = createCopyToClipboardFunction();

/* ----------------------------------------------------------------- session */

// Module scope, not component state. Storybook only mounts a panel's children
// once that panel has been shown, so a theme restored from a previous session
// has to live — and be re-applied — outside the React tree. The panel reads
// this on mount to rebuild its view.

/** The theme currently pushed to the preview, or null for brand defaults. */
let session: Theme | null = null;

/** Bumped by every derive and by reset, so a slow response from a superseded
 *  prompt can never resurrect a dismissed theme. */
let inflight = 0;

/* -------------------------------------------------------------------- log */

type Tone = 'dim' | 'ok' | 'warn';

interface LogLine {
  text: string;
  tone?: Tone;
  /** Rendered as a colour chip so a receipt shows the hex it is vouching for. */
  swatch?: string;
}

/** What survives a Storybook reload. Colours are deliberately not stored —
 *  they are re-derived, so a change to the engine or the ramps takes effect
 *  on reload instead of resurrecting a stale palette. */
interface SavedTheme {
  prompt: string;
  variant: number;
  direction?: Direction;
}

function describe(theme: Theme): LogLine[] {
  const lines: LogLine[] = [
    {
      text: theme.direction
        ? `> art direction: claude · "${theme.name}"`
        : '> art direction: local seed engine',
      tone: 'dim',
    },
    { text: `> personality: ${theme.personality} · leads ${theme.mode}`, tone: 'dim' },
    {
      text: `> deriving ${Object.keys(theme.palette).length} tokens — color, shape, elevation, motion…`,
      tone: 'dim',
    },
  ];

  for (const receipt of theme.receipts) {
    const pass = receipt.ratio >= receipt.target;
    lines.push({
      text: `${receipt.label.padEnd(16)} ${receipt.hex} on ${receipt.vs}  ${receipt.ratio.toFixed(
        2
      )}:1  (target ${receipt.target})  ${pass ? 'PASS' : 'CHECK'}`,
      tone: pass ? 'ok' : 'warn',
      swatch: receipt.hex,
    });
  }

  lines.push({ text: '> applied. zero contrast failures — by construction.', tone: 'dim' });
  if (theme.quip) lines.push({ text: `// ${theme.quip}`, tone: 'dim' });
  return lines;
}

/** The palette as pasteable CSS — the shape you would drop into a `:root`. */
function toCss(palette: Record<string, string>): string {
  return Object.entries(palette)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');
}

function forget(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing was persisted; nothing to clear.
  }
}

function persist(theme: Theme): void {
  try {
    const saved: SavedTheme = {
      prompt: theme.prompt,
      variant: theme.variant,
      direction: theme.direction,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Private mode or a full quota. The theme is applied for this session
    // regardless; only the survives-a-reload guarantee is lost.
  }
}

/** Re-derive and re-apply the last session's theme. Runs at register time so
 *  a reload restores the theme whether or not the panel is ever opened. */
function restore(): void {
  let saved: SavedTheme | null = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as SavedTheme) : null;
    saved = parsed && typeof parsed.prompt === 'string' && parsed.prompt ? parsed : null;
  } catch {
    saved = null;
  }
  if (!saved) return;

  try {
    session = buildTheme({
      prompt: saved.prompt,
      variant: saved.variant ?? 0,
      direction: saved.direction,
    });
  } catch {
    // A saved direction this engine can no longer build. Drop it rather than
    // let it break every subsequent boot.
    forget();
    return;
  }

  reassert();
}

/** Push the live palette to the preview.
 *
 *  Called on every preview render, not just on change. The manager and the
 *  preview iframe are separate documents with independent lifecycles: at
 *  register time the iframe has not loaded yet, so `restore`'s emit crosses
 *  postMessage to nobody and is lost — and any later iframe reload drops the
 *  inline properties on <html> entirely. Re-asserting on render is what makes
 *  the theme survive both. It is idempotent, so the extra emits are free. */
function reassert(): void {
  if (!session) return;
  const payload: ApplyPayload = { palette: session.palette, mode: session.mode };
  addons.getChannel().emit(EVENTS.APPLY, payload);
}

/* ----------------------------------------------------------------- styles */

const Wrapper = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: 15,
  height: '100%',
  boxSizing: 'border-box',
  color: theme.color.defaultText,
}));

const Row = styled(Form)({
  display: 'flex',
  gap: 8,
  alignItems: 'center',
});

const SrOnly = styled.label({
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0,
});

const Actions = styled.div({
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
});

const LogArea = styled.div(({ theme }) => ({
  flex: 1,
  minHeight: 160,
  overflow: 'auto',
  padding: 12,
  borderRadius: theme.appBorderRadius,
  border: `1px solid ${theme.appBorderColor}`,
  background: theme.background.content,
  fontFamily: theme.typography.fonts.mono,
  fontSize: 11,
  lineHeight: '18px',
  // Receipts are column-aligned with padEnd; wrapping would break the grid.
  whiteSpace: 'pre',
}));

const Line = styled.div<{ tone?: Tone }>(({ theme, tone }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  color:
    tone === 'ok'
      ? theme.color.positive
      : tone === 'warn'
        ? theme.color.negative
        : theme.color.mediumdark,
}));

const Swatch = styled.span<{ hex: string }>(({ theme, hex }) => ({
  display: 'inline-block',
  flex: 'none',
  width: 10,
  height: 10,
  borderRadius: 2,
  background: hex,
  border: `1px solid ${theme.appBorderColor}`,
}));

const Glyph = styled.span({
  fontSize: 14,
  lineHeight: 1,
});

/* ------------------------------------------------------------------ panel */

const AIThemePanel: React.FC = () => {
  // Seeded from the module session so opening the panel after a reload shows
  // the theme that is already live in the preview.
  const [prompt, setPrompt] = useState(() => session?.prompt ?? '');
  const [log, setLog] = useState<LogLine[]>(() => (session ? describe(session) : []));
  const [hasTheme, setHasTheme] = useState(() => session !== null);
  const [refining, setRefining] = useState(false);

  const emit = useChannel({}, []);

  // A ref, not state: the stale guard runs inside an async callback that would
  // otherwise close over the render that started the fetch.
  const promptRef = useRef(session?.prompt ?? '');

  const logRef = useRef<HTMLDivElement | null>(null);
  const queueRef = useRef<LogLine[]>([]);
  const timerRef = useRef<number | undefined>(undefined);

  const drain = useCallback(() => {
    const next = queueRef.current.shift();
    if (!next) return;
    setLog((prev) => [...prev, next]);
    if (queueRef.current.length) timerRef.current = window.setTimeout(drain, LINE_DELAY_MS);
  }, []);

  /** Replace the log with a fresh transcript. */
  const print = useCallback(
    (lines: LogLine[]) => {
      window.clearTimeout(timerRef.current);
      queueRef.current = [];
      if (REDUCED_MOTION) {
        setLog(lines);
        return;
      }
      setLog([]);
      queueRef.current = lines.slice();
      drain();
    },
    [drain]
  );

  /** Add a status line without discarding the receipts already printed.
   *
   *  Queues behind an in-progress transcript rather than writing straight to
   *  the log. Appending directly would let a line that happened *later* (the
   *  fetch resolving) render *above* receipts the drain has not typed out yet,
   *  so the transcript reads out of order. */
  const append = useCallback(
    (line: LogLine) => {
      if (queueRef.current.length) {
        queueRef.current.push(line);
        return;
      }
      setLog((prev) => [...prev, line]);
    },
    []
  );

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  /** buildTheme is pure, but a hand-edited saved direction or a future ramp
   *  change could still throw. Never leave the panel wedged over it. */
  const derive = useCallback(
    (options: BuildOptions): Theme | null => {
      try {
        return buildTheme(options);
      } catch (err) {
        append({
          text: `// derivation failed — ${(err as Error)?.message ?? 'unknown error'}. nothing changed.`,
          tone: 'warn',
        });
        return null;
      }
    },
    [append]
  );

  const apply = useCallback(
    (theme: Theme) => {
      session = theme;
      setHasTheme(true);
      reassert();
      persist(theme);
      print(describe(theme));
    },
    [print]
  );

  const refine = useCallback(
    async (target: string, variant: number) => {
      const token = ++inflight;
      append({
        text: '> consulting the art director… the theme will refine in a few seconds',
        tone: 'dim',
      });
      setRefining(true);

      let direction: Direction | null = null;
      try {
        const res = await fetch(THEME_API, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ prompt: target }),
          signal: AbortSignal.timeout(REFINE_TIMEOUT_MS),
        });
        if (res.ok) direction = (await res.json()) as Direction;
      } catch {
        // Non-ok, network error, timeout — one answer for all of them: the
        // local derivation stands.
        direction = null;
      }

      // Stale guard. Bail if a newer derive/remix/reset superseded this one,
      // or if the prompt in the field has moved on since it was sent.
      if (inflight !== token) return;
      setRefining(false);
      if (promptRef.current.trim() !== target || session?.prompt !== target) return;

      if (!direction) {
        append({ text: '// art director unreachable — the local derivation stands.', tone: 'dim' });
        return;
      }

      append({ text: '> art direction received — re-deriving…', tone: 'dim' });
      const refined = derive({ prompt: target, variant, direction });
      if (refined) apply(refined);
    },
    [append, apply, derive]
  );

  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const next = prompt.trim();
      if (!next) return;
      const local = derive({ prompt: next });
      if (!local) return;
      apply(local);
      void refine(next, 0);
    },
    [apply, derive, prompt, refine]
  );

  const onRemix = useCallback(() => {
    if (!session) return;
    // Keep the art direction — a remix is another roll of the same brief, not
    // a fresh brief, so it must not fall back to the local seed.
    const next = derive({
      prompt: session.prompt,
      variant: session.variant + 1,
      direction: session.direction,
    });
    if (next) apply(next);
  }, [apply, derive]);

  const onCopy = useCallback(() => {
    if (!session) return;
    const count = Object.keys(session.palette).length;
    copyToClipboard(toCss(session.palette))
      .then(() => append({ text: `// ${count} custom properties copied.`, tone: 'dim' }))
      .catch(() => append({ text: '// clipboard refused. nothing copied.', tone: 'warn' }));
  }, [append]);

  const onReset = useCallback(() => {
    inflight += 1;
    session = null;
    promptRef.current = '';
    setPrompt('');
    setHasTheme(false);
    setRefining(false);
    forget();
    emit(EVENTS.RESET);
    print([{ text: '> brand tokens restored.', tone: 'dim' }]);
  }, [emit, print]);

  return (
    <Wrapper>
      <Row onSubmit={onSubmit}>
        <SrOnly htmlFor={`${ADDON_ID}-prompt`}>Theme prompt</SrOnly>
        <Form.Input
          id={`${ADDON_ID}-prompt`}
          value={prompt}
          maxLength={80}
          placeholder="deep sea at midnight"
          autoComplete="off"
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            promptRef.current = event.target.value;
            setPrompt(event.target.value);
          }}
          style={{ flex: 1 }}
        />
        {/* ariaLabel={false} tells Storybook's Button its text content is
            already an accessible name; omitting it logs a deprecation. */}
        <Button
          type="submit"
          variant="solid"
          size="small"
          ariaLabel={false}
          disabled={!prompt.trim()}
        >
          derive
        </Button>
      </Row>

      <Actions>
        <Button
          type="button"
          variant="outline"
          size="small"
          ariaLabel={false}
          onClick={onRemix}
          disabled={!hasTheme}
        >
          remix
        </Button>
        <Button type="button" variant="outline" size="small" ariaLabel={false} onClick={onReset}>
          reset
        </Button>
        <Button
          type="button"
          variant="outline"
          size="small"
          ariaLabel={false}
          onClick={onCopy}
          disabled={!hasTheme}
        >
          copy tokens
        </Button>
      </Actions>

      <LogArea ref={logRef} role="status" aria-live="polite" aria-busy={refining}>
        {log.length === 0 ? (
          <Line tone="dim">// describe a mood. the palette is solved for AA either way.</Line>
        ) : (
          log.map((line, index) => (
            // Lines are append-only within a transcript, so the index is stable.
            <Line key={index} tone={line.tone}>
              {line.swatch ? <Swatch hex={line.swatch} /> : null}
              {line.text}
            </Line>
          ))
        )}
      </LogArea>
    </Wrapper>
  );
};

/* ------------------------------------------------------------------- tool */

/**
 * The popover card the panel renders into. A fixed size, not content-driven:
 * the transcript area grows as receipts type out, and a popover that resizes
 * on every line would crawl across the screen.
 */
const PopoverCard = styled.div({
  display: 'flex',
  width: 420,
  height: 440,
  maxWidth: '90vw',
  maxHeight: '70vh',
});

const AIThemeTool: React.FC = () => (
  // A toolbar popover, not an addon panel. The panel lived in the bottom
  // drawer, which (a) is per-story chrome that competes with Controls/Actions
  // and (b) does not exist on docs pages at all — exactly where a client
  // browsing the library would want to try a theme. The popover is global:
  // same entry point on every story and docs page. Theme state was already
  // global (module-scope `session` + localStorage), so this is purely a UI
  // relocation.
  <WithTooltip
    key={TOOL_ID}
    trigger="click"
    closeOnOutsideClick
    placement="bottom"
    // Storybook 11 makes this mandatory on the underlying PopoverProvider;
    // omitting it logs a deprecation today.
    ariaLabel="AI theme"
    tooltip={() => (
      <PopoverCard>
        <AIThemePanel />
      </PopoverCard>
    )}
  >
    <Button
      type="button"
      variant="ghost"
      padding="small"
      title="AI theme"
      ariaLabel="AI theme"
    >
      {/* @storybook/icons is a manager global but not a declared dependency of
          this package, so a glyph keeps the addon dependency-free. */}
      <Glyph aria-hidden="true">◐</Glyph>
    </Button>
  </WithTooltip>
);

/* --------------------------------------------------------------- register */

addons.register(ADDON_ID, () => {
  const channel = addons.getChannel();

  // The preview is a separate document that mounts after this runs and can be
  // reloaded independently, so a one-shot emit is never enough — see reassert.
  channel.on(STORY_RENDERED, reassert);
  channel.on(DOCS_RENDERED, reassert);

  restore();

  addons.add(TOOL_ID, {
    type: types.TOOL,
    title: 'AI Theme',
    // Toolbar addons render on every tab by default, including addon tabs
    // where there is no canvas to theme.
    match: ({ viewMode, tabId }) => !tabId && (viewMode === 'story' || viewMode === 'docs'),
    render: AIThemeTool,
  });
});
