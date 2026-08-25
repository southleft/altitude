/**
 * The migration guide — located and read, never restated.
 *
 * `MIGRATION.md` at the repo root is the v1 → v2 guide: the theming model
 * change, the registry modes, the React 19 floor, the removed components. It is
 * already the thing other surfaces point at — `AGENTS.md`, `CLAUDE.md` and the
 * theme-switcher guidance entry all cite it — and until now this site cited it
 * too without ever rendering it, which made the citation unfollowable for the
 * one audience that reads a documentation site instead of a checkout.
 *
 * NOT ONE WORD OF THE GUIDE LIVES HERE. This module finds the file and reports
 * what it found. Two readers consume it and neither copies it:
 *
 *   HTML   `src/content.config.ts` declares a `migration` collection whose
 *          `glob()` loader is based at the repo root, so Astro's own markdown
 *          pipeline compiles the same file. That is also why no markdown
 *          dependency was added — the site already has a renderer.
 *   .md    `markdownGuide()` below, served verbatim at `/migration.md` and
 *          concatenated into `llms-full.txt`.
 *
 * The page renders the FILE'S OWN `<h1>` rather than adding a second one, so
 * the document keeps one heading and the page title is read from the guide
 * instead of typed beside it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { repoRoot } from './repo-root.mjs';

/** Repo-relative, forward slashes — the path the page cites to the reader. */
export const MIGRATION_PATH = 'MIGRATION.md';

const ABSOLUTE = path.join(repoRoot(), ...MIGRATION_PATH.split('/'));

/**
 * The guide, or a stated reason there is none.
 *
 * Deliberately NOT a thrown error. `icons.mjs` throws when its generated
 * sources change shape, because a silently empty icon page is a lie about a
 * closed set; this is a repo document, and a partial checkout that lacks it
 * should still build a site that says so — the same shape `a11y.mjs` uses for
 * an absent axe report.
 */
export const MIGRATION = (() => {
  let source;
  try {
    source = fs.readFileSync(ABSOLUTE, 'utf8');
  } catch (error) {
    return {
      available: false,
      reason: `No migration guide at ${MIGRATION_PATH} in this checkout (${error.code ?? 'read failed'}).`,
      path: MIGRATION_PATH,
      source: '',
      title: null,
      sections: [],
      bytes: 0,
    };
  }

  /** `## 4b. Icons — Phosphor` → `4b. Icons — Phosphor`. Level-2 only: the
   *  level-3 headings are sub-cases of a step, and a contents list that mixed
   *  them read as twice as many steps as the guide actually has. */
  const sections = [...source.matchAll(/^##\s+(.+?)\s*$/gm)].map((match) => match[1]);

  return {
    available: true,
    reason: null,
    path: MIGRATION_PATH,
    source,
    /** The guide's own `<h1>`. The page uses it, so the title is never typed. */
    title: source.match(/^#\s+(.+?)\s*$/m)?.[1] ?? null,
    sections,
    bytes: Buffer.byteLength(source, 'utf8'),
  };
})();

/**
 * The guide as Markdown, verbatim.
 *
 * Verbatim is the point: `/migration.md` is what an agent fetches when it is
 * about to rewrite a consumer's code, and a paraphrase of a migration
 * instruction is a broken build. The per-site framing is added by
 * `markdown.mjs`, which owns every other renderer, so this stays a reader.
 */
export function migrationSource() {
  return MIGRATION.available ? MIGRATION.source : `_${MIGRATION.reason}_\n`;
}
