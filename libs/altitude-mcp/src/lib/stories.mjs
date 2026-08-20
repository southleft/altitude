// Derives a component's Storybook doc URL from its `.stories.ts` `title:`
// field, using Storybook's own id-sanitization algorithm (lowercase, sanitize
// each `/`-separated segment, join with `-`, append `--docs` for the
// autodocs page). Every al-web-components story carries the `autodocs` tag
// (verified against storybook-static/index.json), so `--docs` always exists.
//
// We parse the `.stories.ts` source directly rather than depending on a
// built storybook-static/index.json, because the story files are tracked in
// git and always present; the built index is a local build artifact that
// may not exist in a fresh clone.

import { readFileSync, existsSync } from 'node:fs';
import { WC_ROOT } from './paths.mjs';

const PRODUCTION_BASE = 'https://altitude.pages.dev/storybook/web-components';

/** Storybook's `sanitize()` — mirrors @storybook/csf's toId() algorithm. */
function sanitize(part) {
  return part
    .toLowerCase()
    .replace(/[ ’–—]/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/** "Atoms/Accordion Panel" -> "atoms-accordion-panel" */
function titleToKindId(title) {
  return title
    .split('/')
    .map(sanitize)
    .filter(Boolean)
    .join('-');
}

/** `components/button/button.ts` -> `components/button/button.stories.ts` (absolute). */
function storiesPathFor(modulePath) {
  const storiesRelative = modulePath.replace(/\.ts$/, '.stories.ts');
  return `${WC_ROOT}/${storiesRelative}`.replace(/\\/g, '/');
}

/**
 * @param {string} modulePath CEM module path, e.g. "components/button/button.ts"
 * @returns {{title:string, storyId:string, docsUrl:string, storiesFile:string}|null}
 */
export function getStoryInfo(modulePath) {
  const storiesFile = storiesPathFor(modulePath);
  if (!existsSync(storiesFile)) return null;
  const src = readFileSync(storiesFile, 'utf8');
  const m = /title:\s*['"]([^'"]+)['"]/.exec(src);
  if (!m) return null;
  const title = m[1];
  const kindId = titleToKindId(title);
  const storyId = `${kindId}--docs`;
  return {
    title,
    storyId,
    docsUrl: `${PRODUCTION_BASE}/?path=/docs/${storyId}`,
    storiesFile,
  };
}
