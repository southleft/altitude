// Southleft-flavoured example content for Storybook stories.
//
// WHAT THIS IS FOR
// ----------------
// `./lorem.ts` answers "what does this component look like with text in it".
// It cannot answer "what does this design system look like as Southleft",
// because lorem ipsum has no voice: a card full of `dolor sit amet` renders the
// same under every brand. The Southleft Storybook (`.storybook-sl/`, port 6007)
// documents a brand whose identity is as much its copy — client names, service
// names, the open-source tooling — as its red accent and its Agrandir display
// face. This module is that copy, taken from the real site.
//
// HOW TO SWAP A STORY OVER (the intended use — no story is rewritten yet)
// ----------------------------------------------------------------------
// Every export mirrors the SHAPE of its `lorem.ts` / `images.ts` counterpart,
// signature for signature, so swapping is an import change and nothing else:
//
//     import { loremSentences, placeholderImages } from '../../.storybook/fixtures';
//     // becomes
//     import { southleftSentences as loremSentences,
//              southleftImages   as placeholderImages } from '../../.storybook/fixtures';
//
//   lorem.ts                          southleft.ts
//   --------------------------------  -------------------------------------
//   LOREM_OPENING                     SOUTHLEFT_OPENING
//   loremWords(count, seed)           southleftWords(count, seed)
//   loremSentence(seed, opening?)     southleftSentence(seed, opening?)
//   loremSentences(n, seed, opening?) southleftSentences(n, seed, opening?)
//   loremParagraph(seed)              southleftParagraph(seed)
//   loremParagraphs(n, seed)          southleftParagraphs(n, seed)
//   images.ts                         southleft.ts
//   --------------------------------  -------------------------------------
//   placeholderImage(w, h, options)   southleftImage(w, h, options)
//   placeholderImages.{avatar,...}    southleftImages.{avatar,...}
//
// Same determinism guarantee as `lorem.ts`: text is SELECTED, never generated,
// by the same seeded PRNG, so a given (shape, seed) pair always produces the
// same string and a story is a stable visual reference. No network, no key.
//
// PROVENANCE. Every client name, service, tool, quote, case study and article
// title below is real, read out of `apps/southleft/src/pages/index.astro`,
// `src/lib/site.ts`, `src/content/work/*.md` and `src/content/insights/*.md`.
// The sentence corpus is lifted from the same sources, occasionally trimmed to
// a single self-contained sentence so it can be recombined at story lengths —
// nothing is invented marketing copy.
//
// IMAGERY. `southleftImages` deliberately keeps using `placeholderImage()` —
// tinted to the brand and labelled with real client names — rather than
// pointing at southleft.com's own media. Story imagery must render offline and
// in CI (`.storybook/test-runner.ts` runs axe against every story); the real
// hero URLs are exported separately as `southleftWork[].hero` for anyone who
// wants them and can accept the network dependency.
//
// SCOPE: `.storybook/` is invisible to the library build — TypeScript's
// wildcard `include` skips dot-directories, and `vite.config.mjs` only takes
// `components/<name>/<name>.ts` as entries. Nothing here ships to consumers.

import { placeholderImage, type PlaceholderOptions } from './images';

// ---------------------------------------------------------------------------
// Real Southleft content
// ---------------------------------------------------------------------------

/** Clients, as named on the home page's logo wall (`index.astro`). */
export const southleftClients = [
  'IBM',
  'Google',
  'PetSmart',
  'Toast',
  'Caterpillar',
  'Cigna Health',
  'Condé Nast',
  'DocuSign',
  'State Farm',
  'Ulta Beauty',
  'CHUBB',
  'Better.com',
] as const;

/** The four services, verbatim from the home page. */
export const southleftServices = [
  {
    name: 'AI + Design Systems',
    href: '/ai-design-systems',
    body: 'Your design system is about to become the most important API your company owns. AI-readiness audits, MCP integrations, discovery and research at the edge of what agents and generative UI make possible.',
    items: ['AI-readiness audits', 'MCP integrations', 'Discovery & research'],
  },
  {
    name: 'Design System Engineering',
    href: '/services/design-systems',
    body: 'Build, scale, and govern systems from Figma to production. Component libraries, token architecture, Storybook and docs — everything typed, tokenized, tested.',
    items: ['Component libraries', 'Token architecture', 'Storybook & docs'],
  },
  {
    name: 'Workshops & Training',
    href: '/services/workshops-training',
    body: 'We teach what we practice — hands-on team workshops, conference talks, and the AI & Design Systems course with Brad Frost. No slideware theory; live demos from real client work.',
    items: ['Team workshops', 'Speaking engagements', 'AI & DS course with Brad Frost'],
  },
  {
    name: 'Team Augmentation',
    href: '/services/team-augmentation',
    body: 'Senior design-system and front-end engineers embedded with your team. They slot into your codebase and ship — direct access to the people writing the code, no hand-offs to a B-team.',
    items: ['Embedded engineers', 'Front-end architecture', 'Training & mentorship'],
  },
] as const;

/** The open-source tools, with the command each one is run by. */
export const southleftTools = [
  { name: 'figma-console-mcp', cmd: 'npx figma-console-mcp', desc: 'AI-powered design system management inside Figma' },
  { name: 'story-ui', cmd: 'npx story-ui init', desc: 'AI layout generation for Storybook via MCP' },
  { name: 'figmalint', cmd: 'figma → plugins → FigmaLint', desc: 'Design linting for developer-ready Figma files' },
  { name: 'design-systems-mcp', cmd: 'npx design-systems-mcp', desc: 'A design systems knowledge base your AI can query' },
  { name: 'altitude', cmd: 'open /tools/altitude', desc: 'Our in-house design system — and our AI testbed' },
] as const;

/** Real client quotes — for testimonial, quote and avatar-with-name stories. */
export const southleftTestimonials = [
  { quote: 'They’re excellent! They make work seem easy — always on time and they communicate clearly along the way.', name: 'Jessi Hall', role: 'Producer, Big Medium' },
  { quote: 'The team was very timely, often delivering even before the deadline and always being responsive.', name: 'Sara Soueidan', role: 'Inclusive Web Design Engineer & Educator' },
  { quote: 'Southleft was instrumental in helping us improve our user experience while simultaneously increasing traffic and revenue.', name: 'Todd Hodgson', role: 'Director of Product Management, Outside Inc.' },
  { quote: 'They go through a high level of detail to understand our needs and follow up to ensure their solutions meet them.', name: 'David Baucum', role: 'CTO, CURA Freight' },
] as const;

/** Case studies (`src/content/work/*.md` frontmatter) — card and list stories. */
export const southleftWork = [
  {
    title: 'Designing Digital Cohesion: PetSmart’s Sparky System Journey',
    client: 'PetSmart',
    industry: 'Retail',
    oneLiner: 'Sparky, PetSmart’s design system — accessible components, documentation, and governance that unified a fragmented web presence.',
    capabilities: ['Design Systems', 'Front-End Development', 'React'],
    hero: 'https://southleft.pages.dev/media/xd.adobe_.com_view_e776c2b6-f1e4-4789-b475-e9922b2f2ade-b225_-1.webp',
  },
  {
    title: 'Stanford d.school: Building a Modular Web Experience for Creative Thinkers',
    client: 'Stanford d.school',
    industry: 'Higher Education',
    oneLiner: 'A Fractal-powered component library and front-end architecture that brought the d.school’s unconventional visual identity to the web on a tight deadline.',
    capabilities: ['Component Library', 'Craft CMS', 'Front-End Development'],
    hero: 'https://southleft.pages.dev/media/d-school-hompage.webp',
  },
  {
    title: 'Replatforming IBM Investor Relations: A Seamless Transition to Modernity and Scalability',
    client: 'IBM',
    industry: 'Enterprise Technology',
    oneLiner: 'Migrating IBM Investor Relations to Drupal while integrating the Carbon design system — trust-critical financial communications, modernized.',
    capabilities: ['Design Systems', 'Drupal Theming', 'Front-End Development'],
    hero: 'https://southleft.pages.dev/media/www.ibm_.com_investor_events.webp',
  },
  {
    title: 'CampusIQ: Building an AI-Ready Design System for Higher Education Technology',
    client: 'CampusIQ',
    industry: 'Higher Education Technology',
    oneLiner: 'A context-based, token-first design system that unified three component libraries into 50+ React components with AI-integrated workflows.',
    capabilities: ['AI + Design Systems', 'Design Systems', 'Front-End Development', 'React'],
    hero: 'https://southleft.pages.dev/media/campusiq-design-token-architecture.webp',
  },
] as const;

/** Article titles from `src/content/insights/` — for article cards and lists. */
export const southleftInsights = [
  'Taming the Shadow DOM: Injecting Global Styles with Adopted Stylesheets',
  'Context-Based Design Systems: A New Model for the AI-Driven Product Lifecycle',
  'Code to Design Isn’t the Point. System Parity Is.',
  'A2UI: How AI Agents Build Real User Interfaces',
  'Building Multi-Brand Design Systems: The Developer’s Perspective',
  'Demystifying Web Components: Understanding Slots (Part 1)',
  'Designing for Developers—and the AI Agents Working Beside Them',
  'Figma Console MCP: AI-Powered Design System Management That Changes Everything',
  'Better, together: Southleft x Baseline, and a new CEO',
  'Brad Frost’s Talk at FRONT ZURICH 2023 – Is Atomic Design Dead?',
] as const;

/**
 * The sentence corpus the text helpers draw from — real Southleft prose
 * (home page lead, service bodies, case-study one-liners, article excerpts).
 */
const SENTENCES: readonly string[] = [
  'We audit, build, and evolve design systems for teams at Caterpillar, Novartis, UPS, and NASDAQ.',
  'We build the open-source AI tooling the design systems community actually uses.',
  'We don’t just talk about this stuff. We build it.',
  'Your design system is about to become the most important API your company owns.',
  'Build, scale, and govern systems from Figma to production.',
  'Component libraries, token architecture, Storybook and docs — everything typed, tokenized, tested.',
  'Senior design-system and front-end engineers embedded with your team.',
  'They slot into your codebase and ship — direct access to the people writing the code, no hand-offs to a B-team.',
  'We teach what we practice — hands-on team workshops, conference talks, and the AI & Design Systems course with Brad Frost.',
  'No slideware theory; live demos from real client work.',
  'AI-readiness audits, MCP integrations, discovery and research at the edge of what agents and generative UI make possible.',
  'PetSmart’s web presence was fragmented across contractors handling different sections of the site.',
  'Accessible, user-friendly components built with Storybook, TypeScript, and Adobe XD, backed by weekly designer/developer syncs.',
  'A meticulously documented, technology-adaptable system with a governance structure teams adopt into their own workflows.',
  'Web components have revolutionized how we build modular, maintainable web applications.',
  'The Shadow DOM guarantees style encapsulation, yet the quest for global styling consistency remains a challenge.',
  'A context-based, token-first design system that unified three component libraries into 50+ React components.',
  'Design systems consulting, engineering, and AI integration — built exclusively on Altitude, Southleft’s own design system.',
] as const;

/** The line that signals "this is Southleft example content" at a glance. */
export const SOUTHLEFT_OPENING = 'AI-powered design systems. Built by the people building the tools.';

/** Word pool for `southleftWords` — the vocabulary of the site, deduped. */
const WORDS: readonly string[] = Array.from(
  new Set(
    [SOUTHLEFT_OPENING, ...SENTENCES]
      .join(' ')
      .toLowerCase()
      .replace(/[^a-z0-9’\- ]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 1),
  ),
);

// ---------------------------------------------------------------------------
// Deterministic selection — identical machinery to ./lorem.ts
// ---------------------------------------------------------------------------

/** FNV-1a, so callers can pass a readable seed instead of a magic number. */
function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — reproducible by design; see the note in ./lorem.ts. */
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

function pick(next: () => number, min: number, max: number): number {
  return min + Math.floor(next() * (max - min));
}

/**
 * `count` words of Southleft vocabulary — for labels, chips, table cells and
 * truncation demos. Same signature as `loremWords`.
 */
export function southleftWords(count: number, seed = 'southleft'): string {
  const next = rng(hashSeed(`${seed}:words:${count}`));
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    words.push(WORDS[pick(next, 0, WORDS.length)]);
  }
  return words.join(' ');
}

/**
 * `count` sentences of real Southleft copy.
 *
 * The first sentence is `SOUTHLEFT_OPENING` unless `brandOpening` is false —
 * the same role `LOREM_OPENING` plays in `loremSentences`. Sentences are drawn
 * without immediate repetition so a long block does not stutter.
 */
export function southleftSentences(count: number, seed = 'southleft', brandOpening = true): string {
  const next = rng(hashSeed(`${seed}:sentences:${count}`));
  const out: string[] = [];
  let last = -1;
  for (let i = 0; i < count; i++) {
    if (i === 0 && brandOpening) {
      out.push(SOUTHLEFT_OPENING);
      continue;
    }
    let at = pick(next, 0, SENTENCES.length);
    if (at === last) at = (at + 1) % SENTENCES.length;
    last = at;
    out.push(SENTENCES[at]);
  }
  return out.join(' ');
}

/** A single sentence — the common case, so it gets its own name. */
export function southleftSentence(seed = 'southleft', brandOpening = true): string {
  return southleftSentences(1, seed, brandOpening);
}

/**
 * `count` paragraphs, returned as an array so callers can map them into
 * whatever element the component expects. Same signature as `loremParagraphs`.
 */
export function southleftParagraphs(count: number, seed = 'southleft'): string[] {
  const next = rng(hashSeed(`${seed}:paragraphs:${count}`));
  const paragraphs: string[] = [];
  let last = -1;
  for (let i = 0; i < count; i++) {
    const sentenceCount = pick(next, 3, 6);
    const sentences: string[] = [];
    for (let s = 0; s < sentenceCount; s++) {
      // Only the very first sentence of the very first paragraph gets the
      // brand opening; repeating it per paragraph reads like a bug.
      if (i === 0 && s === 0) {
        sentences.push(SOUTHLEFT_OPENING);
        continue;
      }
      let at = pick(next, 0, SENTENCES.length);
      if (at === last) at = (at + 1) % SENTENCES.length;
      last = at;
      sentences.push(SENTENCES[at]);
    }
    paragraphs.push(sentences.join(' '));
  }
  return paragraphs;
}

/** A single paragraph. */
export function southleftParagraph(seed = 'southleft'): string {
  return southleftParagraphs(1, seed)[0];
}

// ---------------------------------------------------------------------------
// Imagery — same shape as ./images.ts, tinted and labelled as Southleft
// ---------------------------------------------------------------------------

/** Brand hexes, from the `southleft` host partials (no leading `#`, as placehold.co wants). */
const INK = '181714'; // --al-color-brand-ink-900, the dark canvas
const PAPER = 'F3F1EB'; // --al-color-brand-paper-100, the light canvas
const RED = 'F05735'; // the accent (see the hard-shadow tokens in tokens-brand-southleft.scss)

/**
 * Brand-tinted placeholder, same signature as `placeholderImage`. Options are
 * forwarded, so an explicit `bg`/`fg`/`format` still wins.
 */
export function southleftImage(width: number, height: number, options: PlaceholderOptions = {}): string {
  return placeholderImage(width, height, { bg: INK, fg: PAPER, ...options });
}

/**
 * Named sizes, key-for-key with `placeholderImages`, so a story swaps the
 * import and nothing else. Labelled with real client names instead of the
 * service's default `{width}x{height}`.
 */
export const southleftImages = {
  /** Square avatar / profile photo. */
  avatar: southleftImage(80, 80, { bg: RED, fg: PAPER, text: 'SL' }),
  /** Small square thumbnail for list rows, menu items, toggle buttons. */
  thumbnail: southleftImage(80, 80, { text: 'SL' }),
  /** 3:2 card media. */
  card: southleftImage(600, 400, { text: 'PetSmart — Sparky' }),
  /** 16:9 wide media for heroes and banners. */
  wide: southleftImage(1600, 900, { text: 'AI-powered design systems' }),
  /** Wordmark-shaped strip for logo/brand slots. */
  logo: southleftImage(160, 40, { fg: RED, text: 'southleft' }),
} as const;
