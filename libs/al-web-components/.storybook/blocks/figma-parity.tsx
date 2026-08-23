/**
 * `<FigmaParity tag="al-button" />` — Figma <-> code parity banner for the
 * autodocs page (wired in `../docs-page.tsx`, same pattern as `a11y-report`).
 *
 * Reads the active project's parity report, written by
 * `.storybook/parity-emitter.mjs` from that project's parity manifest
 * (`.altitude/figma-sync/parity-manifest.json` for Altitude). Shows the
 * component's sync status and gives the user something to DO about drift:
 *   * open the mapped Figma component set,
 *   * copy the Figma node id,
 *   * copy a ready-to-run AI reconciliation prompt (generated server-side in
 *     libs/altitude-mcp/src/lib/parity.mjs, so the MCP tool and this block
 *     hand out the identical prompt).
 *
 * Docs blocks run in the PREVIEW iframe (docsMode has no addon panels — see
 * blocks/a11y-report.tsx), so the report is a same-origin fetch in dev and in
 * static builds alike.
 *
 * WHICH report: both Storybooks serve the same `../dist` staticDir, so the two
 * projects' reports differ by FILENAME. `.storybook-sl/preview.ts` sets
 * `globalThis.__AL_PARITY_URL__` to its own; anything that does not set it gets
 * Altitude's `./parity.json`. Read at FETCH time, not module-eval time, so the
 * preview's import order cannot matter.
 */
import React, { useEffect, useState } from 'react';
import { styled } from 'storybook/theming';

type ParityStatus =
  | 'in-sync'
  | 'code-drift'
  | 'figma-drift'
  | 'conflict'
  | 'missing-in-figma'
  | 'missing-in-code'
  | 'excluded';

interface ParityEntry {
  tag: string;
  status: ParityStatus;
  figma: { name: string; nodeId: string | null; url: string } | null;
  lastSync: { date: string; codeHash: string; figmaDigest: string | null } | null;
  note: string | null;
  aiPrompt: string;
}

interface ParityReport {
  generated: string;
  figmaLastRefreshed: string | null;
  /** Written by `parity-emitter.mjs` on engine failure. Present ⇒ the rest of the report is empty and not to be trusted. */
  error?: { message: string; at: string } | string;
  /** The engine's honesty block. `null` on an error report; tolerant of extra fields another agent may add. */
  observation?: { everObserved: boolean; [key: string]: unknown } | null;
  components: ParityEntry[];
}

/**
 * `null` from `fetchReport` used to mean two different things — "the fetch
 * failed" and "the engine threw" — collapsed into one, which is exactly the
 * ambiguity `manager.shared.js` had. Here the report is passed through
 * (including an `error`-shaped one) and ONLY a genuine network/parse failure
 * resolves to `null`; the component below tells the two apart.
 */
let reportPromise: Promise<ParityReport | null> | null = null;
function fetchReport(): Promise<ParityReport | null> {
  if (!reportPromise) {
    const url = (globalThis as { __AL_PARITY_URL__?: string }).__AL_PARITY_URL__ ?? './parity.json';
    reportPromise = fetch(url, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return reportPromise;
}

const TONE: Record<ParityStatus, { color: string; label: string; blurb: string }> = {
  'in-sync': { color: '#16a34a', label: 'In sync with Figma', blurb: 'Code and the Figma component set matched at the last confirmed sync, and neither has drifted since.' },
  'code-drift': { color: '#f59e0b', label: 'Code ahead of Figma', blurb: 'The component source changed since the last confirmed sync — the Figma set is behind.' },
  'figma-drift': { color: '#f59e0b', label: 'Figma ahead of code', blurb: 'The Figma set changed since the last confirmed sync — the code is behind.' },
  conflict: { color: '#f59e0b', label: 'Both sides changed', blurb: 'Code AND Figma each changed since the last confirmed sync. Reconcile deliberately — neither side should be overwritten blindly.' },
  'missing-in-figma': { color: '#ef4444', label: 'Not in Figma', blurb: 'This component exists in code but has no Figma component set yet.' },
  'missing-in-code': { color: '#ef4444', label: 'Not in code', blurb: 'This Figma set has no corresponding code component.' },
  excluded: { color: '#9ca3af', label: 'Not tracked', blurb: 'Deliberately not represented in Figma.' },
};

const Wrapper = styled.div(({ theme }) => ({
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: theme.appBorderRadius,
  background: theme.background.app,
  fontSize: theme.typography.size.s2 - 1,
  fontFamily: theme.typography.fonts.base,
  color: theme.color.defaultText,
  margin: '16px 0 24px',
  overflow: 'hidden',
}));

const Bar = styled.div({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 10,
  padding: '10px 14px',
});

const Dot = styled.span<{ color: string }>(({ color }) => ({
  width: 9,
  height: 9,
  borderRadius: '50%',
  flex: 'none',
  background: color,
}));

const Label = styled.span(({ theme }) => ({
  fontWeight: theme.typography.weight.bold,
}));

const Meta = styled.span(({ theme }) => ({
  color: theme.textMutedColor,
}));

const Actions = styled.span({
  display: 'inline-flex',
  gap: 8,
  marginLeft: 'auto',
  flexWrap: 'wrap',
});

const ActionButton = styled.button(({ theme }) => ({
  all: 'unset',
  cursor: 'pointer',
  padding: '3px 10px',
  borderRadius: 4,
  border: `1px solid ${theme.appBorderColor}`,
  fontSize: theme.typography.size.s1,
  fontWeight: theme.typography.weight.bold,
  color: theme.color.defaultText,
  '&:hover': { borderColor: theme.color.secondary, color: theme.color.secondary },
}));

const ActionLink = ActionButton.withComponent('a');

const Blurb = styled.div(({ theme }) => ({
  padding: '0 14px 10px',
  color: theme.textMutedColor,
}));

/** Small muted inline note — used for both "unavailable" and the freshness caveat, so both read as chrome rather than as a status. */
const MutedNote = styled.div(({ theme }) => ({
  margin: '16px 0 24px',
  padding: '8px 12px',
  fontSize: theme.typography.size.s1,
  color: theme.textMutedColor,
  fontFamily: theme.typography.fonts.base,
}));

const FreshnessNote = styled.div(({ theme }) => ({
  padding: '0 14px 10px',
  fontSize: theme.typography.size.s1 - 1,
  color: theme.textMutedColor,
}));

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * "Figma last observed" caveat text, or `null` when there is nothing worth
 * saying (observed recently). Never observed reads as maximally stale, not as
 * "no data" — silence here is how a dead Figma read started looking clean.
 */
function freshnessCaveat(figmaLastRefreshed: string | null): string | null {
  if (!figmaLastRefreshed) {
    return 'Figma last observed: never — statuses figma-drift/conflict unreachable';
  }
  const ageMs = Date.now() - new Date(figmaLastRefreshed).getTime();
  if (ageMs <= THIRTY_DAYS_MS) return null;
  const days = Math.round(ageMs / (24 * 60 * 60 * 1000));
  return `Figma last observed: ${days} day${days === 1 ? '' : 's'} ago`;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API can be walled off in iframes; the textarea fallback is not.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

const CopyButton = ({ label, text }: { label: string; text: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <ActionButton
      onClick={async () => {
        if (await copyText(text)) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }
      }}
    >
      {copied ? 'Copied ✓' : label}
    </ActionButton>
  );
};

export const FigmaParity = ({ tag }: { tag?: unknown }) => {
  const [entry, setEntry] = useState<ParityEntry | null>(null);
  const [refreshed, setRefreshed] = useState<string | null>(null);
  // 'unreachable' = fetch/parse failed outright; 'engine-error' = a report
  // landed but it's the emitter's error shape. Both used to render nothing.
  const [unavailable, setUnavailable] = useState<null | 'unreachable' | 'engine-error'>(null);

  useEffect(() => {
    if (typeof tag !== 'string') return;
    let alive = true;
    fetchReport().then((report) => {
      if (!alive) return;
      if (!report) {
        setUnavailable('unreachable');
        return;
      }
      if (report.error) {
        setUnavailable('engine-error');
        return;
      }
      setEntry(report.components.find((c) => c.tag === tag) ?? null);
      setRefreshed(report.figmaLastRefreshed);
    });
    return () => {
      alive = false;
    };
  }, [tag]);

  if (unavailable) {
    return (
      <MutedNote data-parity-unavailable={unavailable}>
        {unavailable === 'engine-error'
          ? 'Parity status unavailable — parity engine error'
          : 'Parity status unavailable — could not reach the parity report'}
      </MutedNote>
    );
  }

  if (!entry || entry.status === 'excluded') return null;

  const freshness = freshnessCaveat(refreshed);

  const tone = TONE[entry.status] ?? TONE['missing-in-figma'];
  const synced = entry.lastSync?.date ? new Date(entry.lastSync.date).toLocaleDateString() : null;

  return (
    <Wrapper>
      <Bar>
        <Dot color={tone.color} />
        <Label>{tone.label}</Label>
        {entry.figma?.name && (
          <Meta>
            Figma: “{entry.figma.name}”{entry.figma.nodeId ? ` · ${entry.figma.nodeId}` : ''}
            {synced ? ` · last synced ${synced}` : ''}
            {entry.status === 'figma-drift' || entry.status === 'conflict'
              ? refreshed
                ? ` · Figma read ${new Date(refreshed).toLocaleDateString()}`
                : ''
              : ''}
          </Meta>
        )}
        <Actions>
          {entry.figma?.url && (
            <ActionLink href={entry.figma.url} target="_blank" rel="noreferrer">
              Open in Figma ↗
            </ActionLink>
          )}
          {entry.figma?.nodeId && <CopyButton label="Copy node ID" text={entry.figma.nodeId} />}
          {entry.status !== 'in-sync' && <CopyButton label="Copy AI fix prompt" text={entry.aiPrompt} />}
        </Actions>
      </Bar>
      {entry.status !== 'in-sync' && (
        <Blurb>
          {tone.blurb}
          {entry.note ? ` ${entry.note}` : ''}
          {' '}The “Copy AI fix prompt” button yields a ready-to-paste prompt for a Claude session with the altitude MCP — it names the component, the Figma set, and the exact reconciliation pipeline.
        </Blurb>
      )}
      {freshness && <FreshnessNote data-parity-freshness>{freshness}</FreshnessNote>}
    </Wrapper>
  );
};
