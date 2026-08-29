/**
 * parity-receipt.mjs — the receipt that makes `in-sync` a VERIFIED state
 * rather than an asserted one.
 *
 * T1, spec 2026-08-29-parity-judgement-gates-and-evals.
 *
 * THE DEFECT THIS CLOSES. `scripts/figma-atoms/check-parity.mjs` compared
 * built Figma variant sizes against the measured browser sizes, printed a
 * tally, and then returned 0 whatever it found — it exited non-zero only when
 * it could not READ an ops file or reach the Figma shim, never when the
 * comparison actually failed. `scripts/figma-parity/mark-synced.mjs` then
 * stamped `lastSync`, which is what flips a component to `in-sync` for
 * `altitude_check_parity`, `GET /parity.json` and the docs-site ParityPanel.
 * Its header said "Run AFTER a verified sync (check-parity.mjs passing...)" —
 * a comment, not a check. Nothing between "an agent decided it was
 * reconciled" and a green badge looked at anything.
 *
 * THE MODEL. check-parity WRITES a receipt naming, per component, whether the
 * comparison passed and WHAT STATE it passed against; mark-synced READS it and
 * refuses to stamp a component whose receipt is missing, failing, or stale.
 *
 * WHY TWO DIFFERENT STALENESS RULES, one per side:
 *   - The CODE side is bound by hash. `sourceKeyFor()` below is called by both
 *     scripts, so the receipt records exactly the digests mark-synced will
 *     recompute. Edit the component after checking and the hashes disagree —
 *     the receipt is refused by construction, with no clock involved.
 *   - The FIGMA side has no such hash available at check time (check-parity
 *     reads the live canvas through the shim, it does not digest it), so its
 *     freshness is bounded by TIME instead. `MAX_AGE_HOURS` is a judgement
 *     call, not a measured fact: 24h is long enough for a reconciliation
 *     session, short enough that yesterday's canvas cannot green-light today's
 *     stamp. Override per run with `--max-receipt-age-hours`.
 *
 * The receipt lives under the project's (gitignored) figma-sync dir beside the
 * other observations — it records what someone measured at a moment, which is
 * exactly the tier of artifact that must not be tracked.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import {
  contractDigest,
  hashComponentSource,
  resolveComponentRoster,
} from '../../libs/altitude-mcp/src/lib/parity.mjs';

export const RECEIPT_SCHEMA_VERSION = 1;

/** Default Figma-side freshness bound, in hours. See the header for why this is time-based. */
export const MAX_AGE_HOURS = 24;

/** `<figmaSyncDir>/verify/check-parity.json` for the given resolved project. */
export function receiptPath(project) {
  return join(project.resolved.figmaSyncDir, 'verify', 'check-parity.json');
}

/**
 * The digests that identify WHICH VERSION of a component was verified.
 *
 * Called by check-parity (to record) and mark-synced (to compare), so the two
 * can never compute it differently. Returns null for a tag the roster does not
 * know — a receipt entry with no source key can never satisfy the gate, which
 * is the honest outcome rather than a silently-passing one.
 *
 * @param {object} project resolved project record
 * @param {Map<string, object>} rosterByTag from `rosterIndex(project)`
 * @param {string} tag component tag
 */
export function sourceKeyFor(rosterByTag, tag) {
  const entry = rosterByTag.get(tag);
  if (!entry) return null;
  const { component, view } = entry;
  return {
    codeHash: hashComponentSource(component.modulePath, view),
    contractDigest: contractDigest(component),
  };
}

/** tag -> roster entry, using the same roster computeParity() and mark-synced use. */
export function rosterIndex(project) {
  return new Map(resolveComponentRoster(project).roster.map((r) => [r.component.tag, r]));
}

/**
 * Write the receipt for a completed check-parity run.
 *
 * Deliberately REPLACES rather than merges: a receipt file that accumulated
 * per-tag results across runs would let a passing result from an old run keep
 * greenlighting a stamp long after a later run failed that same tag. One run,
 * one receipt, one moment in time.
 */
export function writeReceipt(project, { tolerancePx, components, observedFileKey = null, observedFileName = null }) {
  const path = receiptPath(project);
  mkdirSync(dirname(path), { recursive: true });
  const receipt = {
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    project: project.id,
    // EXPECTED (from config) and OBSERVED (from the live bridge) are recorded
    // separately and deliberately. The receipt used to store only
    // `project.figma.fileName` - what it INTENDED to measure, never what it
    // actually measured - so a run against whatever file happened to be
    // active produced a receipt indistinguishable from a correct one.
    figmaFile: project.figma.fileName,
    figmaFileKey: project.figma.fileKey ?? null,
    observedFileKey,
    observedFileName,
    checkedAt: new Date().toISOString(),
    tolerancePx,
    components,
  };
  writeFileSync(path, JSON.stringify(receipt, null, 2) + '\n', 'utf8');
  return path;
}

/** Read the receipt, or null when none has ever been written for this project. */
export function readReceipt(project) {
  const path = receiptPath(project);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Does the receipt authorise stamping `tag` right now?
 *
 * @returns {{ok: boolean, reason: string, checkedAt: string|null}} `reason` is
 *   always populated — including on success — so a caller can record HOW a
 *   stamp was authorised rather than only that it was.
 */
export function receiptAuthorises(receipt, tag, currentKey, { maxAgeHours = MAX_AGE_HOURS, now = Date.now() } = {}) {
  if (!receipt) {
    return { ok: false, reason: 'no check-parity receipt exists for this project', checkedAt: null };
  }
  const entry = receipt.components?.[tag];
  if (!entry) {
    return { ok: false, reason: 'the last check-parity run did not cover this component', checkedAt: receipt.checkedAt ?? null };
  }
  const checkedAt = receipt.checkedAt ?? null;
  // Was this receipt measured against THIS project's Figma file? A receipt
  // that does not say is refused rather than assumed: pre-guard receipts
  // carry no observedFileKey, and silently trusting them would preserve
  // exactly the hole the field was added to close.
  const wantKey = receipt.figmaFileKey ?? null;
  if (!receipt.observedFileKey) {
    return { ok: false, reason: 'the receipt does not record which Figma file it measured - re-run check-parity', checkedAt };
  }
  if (wantKey && receipt.observedFileKey !== wantKey) {
    return {
      ok: false,
      reason: `the receipt was measured against ${receipt.observedFileName ? `"${receipt.observedFileName}" ` : ''}(${receipt.observedFileKey}), not this project's Figma file (${wantKey})`,
      checkedAt,
    };
  }
  if (entry.ok !== true) {
    const detail = entry.unverifiable
      ? `check-parity could not verify it (${entry.unverifiable})`
      : `check-parity found ${entry.off ?? 0} variant(s) outside tolerance and ${entry.missing ?? 0} missing`;
    return { ok: false, reason: detail, checkedAt };
  }
  if (!currentKey || !entry.sourceKey) {
    return { ok: false, reason: 'the receipt records no source digests, so freshness cannot be established', checkedAt };
  }
  if (entry.sourceKey.codeHash !== currentKey.codeHash || entry.sourceKey.contractDigest !== currentKey.contractDigest) {
    return { ok: false, reason: 'the component source changed after it was checked — the receipt is stale', checkedAt };
  }
  const ageMs = now - Date.parse(checkedAt ?? '');
  if (!Number.isFinite(ageMs)) {
    return { ok: false, reason: 'the receipt has no readable timestamp', checkedAt };
  }
  if (ageMs > maxAgeHours * 3600_000) {
    const hours = Math.round(ageMs / 3600_000);
    return { ok: false, reason: `the receipt is ${hours}h old (limit ${maxAgeHours}h) — the Figma side may have moved since`, checkedAt };
  }
  return { ok: true, reason: `check-parity passed at ${checkedAt}`, checkedAt };
}
