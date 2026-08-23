// Deterministic lorem ipsum filler for Storybook stories.
//
// WHY THIS IS LOCAL AND NOT AN API CALL
// ------------------------------------
// The obvious move is `fetch('https://api.api-ninjas.com/v1/loremipsum')`.
// Three things rule it out for a design-system Storybook:
//
//   1. It needs a secret. That endpoint returns HTTP 400 `{"error": "Missing
//      API Key."}` without an `X-Api-Key` header. Storybook deploys publicly
//      to altitude.pages.dev, so any key reaching the browser bundle is a
//      public key. (The one API this Storybook *does* call keeps its key in
//      Node and proxies it — see `.storybook/ai-theme/vite-plugin-theme-api.ts`
//      — but that buys live AI themes; filler text is not worth an endpoint.)
//   2. It makes stories async and network-dependent. `.storybook/test-runner.ts`
//      runs axe-core against every story; content that arrives late, or never
//      (offline, rate-limited, CI without egress), turns a11y assertions flaky
//      and breaks the offline dev loop.
//   3. It makes stories non-deterministic. In a design system the story IS the
//      visual reference — filler that reflows on every reload means a component
//      demo that never looks the same twice.
//
// So: same authoring ergonomics, no network, no key, and byte-identical output
// on every render. Text is generated from the classic Lorem Ipsum vocabulary by
// a seeded PRNG, so a given (shape, seed) pair always produces the same string.
//
// SCOPE: `.storybook/` is invisible to the library build — TypeScript's wildcard
// `include` skips dot-directories, and `vite.config.mjs` only takes
// `components/<name>/<name>.ts` as entries. Nothing here ships to consumers.

/** The classic Lorem Ipsum vocabulary. */
const WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
  'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
  'velit', 'esse', 'cillum', 'eu', 'fugiat', 'nulla', 'pariatur', 'excepteur',
  'sint', 'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui',
  'officia', 'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum', 'curabitur',
  'pretium', 'tincidunt', 'lacus', 'nulla', 'gravida', 'orci', 'a', 'odio',
  'nullam', 'varius', 'turpis', 'commodo', 'condimentum', 'luctus', 'nibh',
  'mauris', 'vitae', 'tellus', 'facilisis', 'aenean', 'porttitor', 'metus',
  'vestibulum', 'rhoncus', 'feugiat', 'fringilla', 'praesent', 'congue', 'dui',
  'convallis', 'ultrices', 'vulputate', 'auctor', 'sagittis', 'massa', 'donec',
  'sollicitudin', 'phasellus', 'egestas', 'lacinia', 'sodales', 'leo', 'interdum',
];

/** The canonical opening line, which readers recognize as "this is filler". */
export const LOREM_OPENING = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';

/**
 * FNV-1a. Turns a seed string into a 32-bit integer so callers can pass a
 * readable seed (usually the component name) instead of a magic number.
 */
function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * mulberry32 — a tiny, well-distributed 32-bit PRNG. Chosen over `Math.random`
 * precisely because it is reproducible: the whole point is that a story renders
 * the same text on every reload.
 */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Inclusive-exclusive integer pick. */
function pick(next: () => number, min: number, max: number): number {
  return min + Math.floor(next() * (max - min));
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Build one sentence of `length` words, with a comma dropped somewhere in the
 * middle for longer sentences so the filler has believable rhythm.
 */
function buildSentence(next: () => number, length: number): string {
  const words: string[] = [];
  for (let i = 0; i < length; i++) {
    words.push(WORDS[pick(next, 0, WORDS.length)]);
  }
  // A comma only reads naturally when there is text on both sides of it.
  if (length >= 8) {
    const at = pick(next, 3, length - 3);
    words[at] = `${words[at]},`;
  }
  return `${capitalize(words.join(' '))}.`;
}

/**
 * `count` words of filler — for labels, chips, table cells, truncation demos.
 *
 * @param count Number of words.
 * @param seed  Stable seed; pass the component name so each component's filler
 *              is distinct but never changes between reloads.
 */
export function loremWords(count: number, seed = 'altitude'): string {
  const next = rng(hashSeed(`${seed}:words:${count}`));
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    words.push(WORDS[pick(next, 0, WORDS.length)]);
  }
  return words.join(' ');
}

/**
 * `count` sentences of filler.
 *
 * The first sentence is the canonical `LOREM_OPENING` unless `classicOpening`
 * is false — it is the line that signals "placeholder" at a glance, and it
 * keeps these stories looking like they always have.
 */
export function loremSentences(count: number, seed = 'altitude', classicOpening = true): string {
  const next = rng(hashSeed(`${seed}:sentences:${count}`));
  const sentences: string[] = [];
  for (let i = 0; i < count; i++) {
    if (i === 0 && classicOpening) {
      sentences.push(LOREM_OPENING);
      continue;
    }
    sentences.push(buildSentence(next, pick(next, 8, 16)));
  }
  return sentences.join(' ');
}

/** A single sentence — the common case, so it gets its own name. */
export function loremSentence(seed = 'altitude', classicOpening = true): string {
  return loremSentences(1, seed, classicOpening);
}

/**
 * `count` paragraphs, returned as an array so callers can map them into
 * whatever element the component expects (`<p>`, `<al-text-block>`, a slot).
 */
export function loremParagraphs(count: number, seed = 'altitude'): string[] {
  const next = rng(hashSeed(`${seed}:paragraphs:${count}`));
  const paragraphs: string[] = [];
  for (let i = 0; i < count; i++) {
    const sentenceCount = pick(next, 3, 6);
    const sentences: string[] = [];
    for (let s = 0; s < sentenceCount; s++) {
      // Only the very first sentence of the very first paragraph gets the
      // classic opening; repeating it per paragraph reads like a bug.
      if (i === 0 && s === 0) {
        sentences.push(LOREM_OPENING);
        continue;
      }
      sentences.push(buildSentence(next, pick(next, 8, 16)));
    }
    paragraphs.push(sentences.join(' '));
  }
  return paragraphs;
}

/** A single paragraph. */
export function loremParagraph(seed = 'altitude'): string {
  return loremParagraphs(1, seed)[0];
}
