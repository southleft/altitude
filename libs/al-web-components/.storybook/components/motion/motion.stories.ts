import { html, type TemplateResult } from 'lit';
import { choreography, createCache, keyframePresets, resolveValue, run } from '../../../motion';
import '../../../components/theme/theme';
import '../../../components/button/button';

/**
 * Demo surface for the Tier 3 motion runtime.
 *
 * The story that matters is `MotionAxis`. It renders the SAME choreography
 * token inside three `<al-theme>` hosts that differ only by their `motion`
 * attribute, and prints the duration each one actually resolves. That is the
 * end-to-end proof that the JS layer reads its timing from the scoped theme
 * rather than from `:root` — the single most important divergence from the
 * system this was ported from.
 */
export default {
  title: 'Foundations/Motion',
  tags: ['autodocs'],
  parameters: {
    status: { type: 'beta' },
    docs: {
      description: {
        component:
          'Tier 3 choreography — a dependency-free WAAPI runtime driven by the same ' +
          'design tokens as the CSS layers, and governed by the `<al-theme motion>` axis.',
      },
    },
  },
};

/** The role token whose resolved value encodes the axis decision. */
const ROLE_BASE = 'var(--al-theme-animation-duration-role-base, var(--al-theme-animation-duration))';

const CARD_STYLE = [
  'display:grid',
  'place-items:center',
  'min-height:64px',
  'border-radius:var(--al-theme-border-radius)',
  'background:var(--al-theme-color-background-primary-default)',
  'color:var(--al-theme-color-content-primary-weak)',
  'font:var(--al-theme-typography-body-md)',
].join(';');

const PANEL_STYLE = [
  'flex:1 1 240px',
  'padding:var(--al-theme-space-md, 16px)',
  'border:1px solid var(--al-theme-color-border-default, #ccc)',
  'border-radius:8px',
].join(';');

/** Nine demo cards — enough for `center-out` to read clearly. */
const cards = (): TemplateResult[] =>
  Array.from({ length: 9 }, (_, i) => html`<div style=${CARD_STYLE}>${i + 1}</div>`);

/**
 * Resolve the governing duration for a panel and paint it into the readout.
 * Reads from a card INSIDE the theme, because resolution is element-scoped.
 */
const report = (panel: Element): void => {
  const probe = panel.querySelector('[data-grid]');
  const out = panel.querySelector('[data-readout]');
  if (!probe || !out) return;
  const resolved = resolveValue(ROLE_BASE, probe, createCache());
  out.textContent = `role-base resolves to: ${resolved || '(unset)'}`;
};

/** Replay a token on the panel's grid, then refresh its readout. */
const replay = async (event: Event, token: string): Promise<void> => {
  const panel = (event.currentTarget as Element).closest('[data-panel]');
  const grid = panel?.querySelector('[data-grid]');
  if (!panel || !grid) return;
  // Clear the previous run's `fill: 'both'` end state, or the replay is invisible.
  grid.getAnimations({ subtree: true }).forEach((a) => a.cancel());
  report(panel);
  await run(token, grid);
};

const axisPanel = (motion: string, label: string, note: string): TemplateResult => html`
  <al-theme motion=${motion} data-panel style=${PANEL_STYLE}>
    <h3 style="margin:0 0 4px">${label}</h3>
    <p style="margin:0 0 4px;opacity:.7;font-size:13px">${note}</p>
    <p data-readout style="margin:0 0 12px;font-family:monospace;font-size:12px">&nbsp;</p>
    <al-button
      @click=${(e: Event) => {
        void replay(e, 'grid-reveal');
      }}
      >Replay grid-reveal</al-button
    >
    <div
      data-grid
      style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px"
    >
      ${cards()}
    </div>
  </al-theme>
`;

/**
 * The proof. Three identical grids, three `motion` values, one document.
 *
 * Expected: `full` animates at the theme default, `expressive` is visibly
 * slower and springier, and `reduced` snaps to its end state with no travel and
 * no cascade. The readout under each heading shows the duration the JS runtime
 * actually resolved for that subtree.
 */
export const MotionAxis = () => {
  // Paint the readouts once the themes have upgraded and their tokens apply.
  requestAnimationFrame(() => {
    document.querySelectorAll('[data-panel]').forEach(report);
  });

  return html`
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">
      ${axisPanel('full', 'motion="full"', 'Opts back in even under OS reduced-motion.')}
      ${axisPanel('expressive', 'motion="expressive"', 'Longer durations, spring curve.')}
      ${axisPanel('reduced', 'motion="reduced"', 'Durations zeroed; stagger collapses.')}
    </div>
    <p style="margin-top:16px;opacity:.7;font-size:13px">
      Turn on your OS “reduce motion” setting and replay: every panel except
      <code>motion="full"</code> should go instant, including the unthemed default.
    </p>
  `;
};

/**
 * Nested themes — the case that broke the axis before the token sets were made
 * complete.
 *
 * Custom properties inherit, so a nested `<al-theme>` that declares only part
 * of the motion token set adopts the rest from its ancestor. Every panel here
 * pairs an outer theme with a conflicting inner one; the inner theme is what is
 * measured, and it must behave exactly as if the outer were not there.
 *
 * `Baseline` is the reference: a lone default theme. `reduced > full` and
 * `expressive > full` must match it exactly.
 */
const nestedPanel = (outer: string | null, inner: string | null, note: string): TemplateResult => html`
  <al-theme motion=${outer ?? undefined} style="display:contents">
    <al-theme
      motion=${inner ?? undefined}
      data-panel
      data-case="${outer ?? 'none'}>${inner ?? 'unset'}"
      style=${PANEL_STYLE}
    >
      <h3 style="margin:0 0 4px;font-size:14px">
        ${outer ? `motion="${outer}"` : '(no outer)'} &rsaquo;
        <strong>${inner ? `motion="${inner}"` : '(unset)'}</strong>
      </h3>
      <p style="margin:0 0 4px;opacity:.7;font-size:13px">${note}</p>
      <p data-readout style="margin:0 0 12px;font-family:monospace;font-size:12px">&nbsp;</p>
      <al-button
        @click=${(e: Event) => {
          void replay(e, 'grid-reveal');
        }}
        >Replay</al-button
      >
      <div
        data-grid
        style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px"
      >
        ${cards()}
      </div>
    </al-theme>
  </al-theme>
`;

export const NestedThemes = () => {
  requestAnimationFrame(() => {
    document.querySelectorAll('[data-panel]').forEach(report);
  });

  return html`
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">
      ${nestedPanel(null, null, 'Reference. Everything below must match this or its axis value.')}
      ${nestedPanel('reduced', 'full', 'The documented opt-back-in. Must equal the reference.')}
      ${nestedPanel('expressive', 'full', 'Must drop the ancestor spring + long durations.')}
      ${nestedPanel('reduced', 'expressive', 'Must animate on BOTH role and legacy tokens.')}
      ${nestedPanel('expressive', 'reduced', 'Must be fully inert.')}
    </div>
  `;
};

/** Every shipped choreography token, run against a nine-card grid. */
export const ChoreographyTokens = () => html`
  <al-theme data-panel style=${PANEL_STYLE}>
    <p data-readout style="margin:0 0 12px;font-family:monospace;font-size:12px">&nbsp;</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      ${Object.keys(choreography)
        .filter((name) => choreography[name].pattern === 'stagger' || choreography[name].pattern === 'parallel')
        .map(
          (name) => html`
            <al-button
              @click=${(e: Event) => {
                void replay(e, name);
              }}
              >${name}</al-button
            >
          `
        )}
    </div>
    <div data-grid style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${cards()}</div>
  </al-theme>
`;

/** The keyframe preset gallery — every shape, replayable in isolation. */
export const KeyframePresets = () => html`
  <al-theme>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px">
      ${Object.keys(keyframePresets).map(
        (name) => html`
          <div style="text-align:center">
            <div
              data-preset=${name}
              style="${CARD_STYLE};min-height:88px;cursor:pointer"
              title="Click to replay"
              @click=${(e: Event) => {
                const el = e.currentTarget as Element;
                el.getAnimations().forEach((a) => a.cancel());
                void import('../../../motion').then(({ animatePreset }) => animatePreset(el, name));
              }}
            >
              ${name}
            </div>
          </div>
        `
      )}
    </div>
    <p style="margin-top:16px;opacity:.7;font-size:13px">
      Click any tile to replay it. <code>unmask</code> looks like nothing happens on its own —
      it needs the <code>al-motion-text-reveal()</code> wall to clip against.
    </p>
  </al-theme>
`;
