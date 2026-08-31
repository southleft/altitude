/**
 * A single action offered by `<al-command-palette>`.
 */
export interface ALCommandAction {
  /** Stable identifier, echoed back in the `onCommandPaletteAction` event detail. */
  id: string;
  /** Visible action text, and the primary fuzzy-match target. */
  label: string;
  /** Optional group heading the action is rendered under. Ungrouped actions render first. */
  group?: string;
  /** Extra terms matched against the query but not displayed (aliases, synonyms). */
  keywords?: Array<string>;
  /** A registered `<al-icon>` glyph name (see the icon system in AGENTS.md) rendered before the label. */
  icon?: string;
}

interface ScoredAction {
  action: ALCommandAction;
  score: number;
}

/**
 * Subsequence fuzzy match: every character of `query` must appear in `text`,
 * in order, though not necessarily contiguously. Returns `null` on no match,
 * otherwise a score where lower is better (fewer/tighter gaps between
 * matched characters, and an earlier match start, score best).
 */
export function fuzzyScore(query: string, text: string): number | null {
  if (!query) {
    return 0;
  }
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  let qi = 0;
  let firstMatchIndex = -1;
  let lastMatchIndex = -1;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      if (firstMatchIndex === -1) {
        firstMatchIndex = ti;
      }
      lastMatchIndex = ti;
      qi++;
    }
  }

  if (qi < q.length) {
    return null;
  }

  const spread = lastMatchIndex - firstMatchIndex;
  // Exact substring matches score best; ties broken by an earlier match start.
  const isContiguous = t.includes(q);
  return (isContiguous ? 0 : spread + 1) * 1000 + firstMatchIndex;
}

/**
 * Fuzzy-searches `actions` by `query` against each action's `label`,
 * `group`, and `keywords`. Returns all actions (in their original order)
 * when `query` is empty, otherwise the matching subset sorted best-match-first.
 */
export function fuzzySearchActions(actions: Array<ALCommandAction>, query: string): Array<ALCommandAction> {
  if (!query.trim()) {
    return actions;
  }

  const scored: Array<ScoredAction> = [];
  actions.forEach((action) => {
    const haystack = [action.label, action.group, ...(action.keywords ?? [])].filter(Boolean).join(' ');
    const score = fuzzyScore(query, haystack);
    if (score !== null) {
      scored.push({ action, score });
    }
  });

  return scored.sort((a, b) => a.score - b.score).map((entry) => entry.action);
}
