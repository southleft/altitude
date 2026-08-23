/**
 * POST /api/theme — AI art direction for the Storybook token console.
 *
 * Claude proposes the direction (hues, chroma, shape, motion, a name, a quip);
 * the client-side OKLCH solver still derives every token and enforces WCAG AA,
 * so nothing the model returns can ship an inaccessible palette.
 *
 * Cloudflare Pages Function — deploys automatically with the Pages build
 * (wrangler bundles the ./functions directory). Configure in the Pages project
 * settings (Settings → Environment variables):
 *   ANTHROPIC_API_KEY  (required — endpoint returns 503 without it and the
 *                       console falls back to its local seed engine)
 *   THEME_MODEL        (optional — defaults to claude-haiku-4-5. A larger model
 *                       gives richer direction at higher cost, but see the
 *                       max_tokens note by the request body first: models newer
 *                       than 4.6 think by default and will truncate at 800.)
 *
 * Raw fetch instead of the Anthropic SDK on purpose: the repo has a
 * no-new-npm-deps rule, Pages Functions deploy dependency-free this way, and
 * the same file is imported straight into the app dev server by the Vite
 * plugin at libs/al-web-components/vite-plugins/theme-api.mjs, so there is
 * exactly one copy of the handler and the prompt.
 */

const PERSONALITIES = ['editorial', 'brutalist', 'geometric', 'luxe', 'playful']

const MODES = ['light', 'dark']
const BG_TINTS = ['neutral', 'tinted', 'vivid']
const RADII = ['sharp', 'subtle', 'rounded', 'pill']
const ELEVATIONS = ['flat', 'subtle', 'lifted', 'deep']
const MOTIONS = ['snappy', 'smooth', 'springy', 'stately']
const BORDER_WEIGHTS = ['hairline', 'standard', 'thick']

// Layout vocabulary — spec 2026-08-20-southleft-example-app, T5. Additive to
// the art-direction contract: the AI still returns no CSS and no markup, only
// small structured intent. `sectionOrder` is a permutation of the home page's
// SIX reorderable sections — hero and footer are NOT in this vocabulary at
// all, so the model has no way to misplace them; the client-side resolver
// (apps/southleft/src/lib/layout-resolver.ts) enforces the rest of the
// structural invariants (CTA never before featured work, reading order ==
// DOM order) and degrades to the default order on anything malformed.
const HERO_COMPOSITIONS = ['centered', 'split', 'poster']
const SECTION_ORDER_IDS = ['logos', 'services', 'work', 'testimonials', 'insights', 'cta']
const GRID_DENSITIES = ['airy', 'regular', 'dense']
const CONTENT_WIDTHS = ['narrow', 'regular', 'wide']
const SECTION_EMPHASIS = ['services', 'work', 'none']

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'accentHue',
    'secondaryHue',
    'neutralHue',
    'chroma',
    'personality',
    'mode',
    'bgTint',
    'radius',
    'elevation',
    'motion',
    'borderWeight',
    'name',
    'quip',
    'heroComposition',
    'sectionOrder',
    'gridDensity',
    'contentWidth',
    'sectionEmphasis',
  ],
  properties: {
    accentHue: {
      type: 'number',
      description:
        'Primary brand hue in OKLCH degrees, 0-360. This drives buttons, links, focus rings, and every interactive accent in the library — pick the hue the prompt is actually about.',
    },
    secondaryHue: {
      type: 'number',
      description:
        'Companion hue in OKLCH degrees, 0-360, used for secondary actions, badges, and chart series two. Give it a considered relationship to accentHue: 20-40 degrees away reads harmonious, ~180 degrees away reads deliberate and tense. Not a random third color.',
    },
    neutralHue: {
      type: 'number',
      description:
        'Hue in OKLCH degrees, 0-360, tinting the neutral background and content ramps — surfaces, borders, body text. Usually the accent hue or a subtle tilt away from it, so greys feel like they belong to the same world. A neutral pulled far from the accent reads cold and institutional.',
    },
    chroma: {
      type: 'number',
      description:
        'OKLCH chroma of the accent ramp, 0.02 (near-monochrome, barely-there color) to 0.27 (electric, screen-saturated). Restraint lives at 0.03-0.07; confident brand color at 0.10-0.16; anything above 0.20 should be a deliberate shout.',
    },
    personality: {
      type: 'string',
      enum: PERSONALITIES,
      description:
        'The shape-and-physicality family the components adopt. Sets the defaults for corner radius, border weight, elevation, and motion, which the individual dials below can then override.',
    },
    mode: {
      type: 'string',
      enum: MODES,
      description:
        'Which mode the theme leads with. Both are always derived; this picks the opening act — paper-white surfaces for bright, clean, daytime prompts, ink-dark for nocturnal, moody, or high-contrast-tech ones.',
    },
    bgTint: {
      type: 'string',
      enum: BG_TINTS,
      description:
        'How much color the canvas and surface ramps carry. neutral = professional near-grey that stays out of the way; tinted = surfaces clearly belong to the hue; vivid = the canvas IS the color (deep forest page, blush paper). Vivid is one of the most dramatic moves available.',
    },
    radius: {
      type: 'string',
      enum: RADII,
      description:
        'Corner radius scale for buttons, inputs, cards, and dialogs. sharp = 0, hard technical corners; subtle = 2-4px, quietly modern; rounded = 8-12px, friendly and soft; pill = fully rounded ends on anything button-shaped.',
    },
    elevation: {
      type: 'string',
      enum: ELEVATIONS,
      description:
        'Shadow language for cards, popovers, and dialogs. flat = no shadow, separation comes from borders alone; subtle = a crisp 1-2px lift; lifted = a clear floating card; deep = large soft shadows that feel plush and nocturnal.',
    },
    motion: {
      type: 'string',
      enum: MOTIONS,
      description:
        'Transition physics for hovers, dialogs, accordions, and toasts. snappy = near-instant, ~100ms linear-ish; smooth = standard ~200ms ease; springy = overshoot bounce; stately = slow, ~400ms glide.',
    },
    borderWeight: {
      type: 'string',
      enum: BORDER_WEIGHTS,
      description:
        'How present the strokes are on inputs, cards, and table rules. hairline = 1px at low contrast, nearly a whisper; standard = 1px at readable contrast; thick = 2px or more, drawn like an outline you are meant to notice.',
    },
    name: {
      type: 'string',
      description: 'Evocative theme name, 2-4 words, lowercase',
    },
    quip: {
      type: 'string',
      description: 'One dry lowercase remark about the theme, max 80 chars, no emoji',
    },
    heroComposition: {
      type: 'string',
      enum: HERO_COMPOSITIONS,
      description:
        'How the home page hero composes. centered = content and media stacked, centered, no side-by-side tension — calm, editorial, reads like a title page. split = content and media side by side — the default, balanced, works for most prompts. poster = media becomes a full-bleed backdrop with content overlaid — dramatic, only earn this for prompts that want a big visual statement.',
    },
    sectionOrder: {
      type: 'array',
      description:
        "The home page's six reorderable sections, permuted into the order they should read in top to bottom. The hero is always first and the footer is always last — do not include them, they are not part of this list and cannot move. Reorder the rest to match the prompt's priorities: a sales-forward prompt might want cta earlier, a proof-forward prompt might lead with work, a content-forward prompt might lead with insights. logos (client trust band), services (what we do), work (case studies), testimonials, insights (latest writing), cta (closing call to action) — list all six exactly once.",
      items: { type: 'string', enum: SECTION_ORDER_IDS },
      minItems: SECTION_ORDER_IDS.length,
      maxItems: SECTION_ORDER_IDS.length,
      uniqueItems: true,
    },
    gridDensity: {
      type: 'string',
      enum: GRID_DENSITIES,
      description:
        'How tightly the card grids pack. airy = generous gaps, room to breathe, editorial and calm. regular = the default rhythm. dense = tight gaps, a lot of content visible at once — technical, busy, information-forward prompts.',
    },
    contentWidth: {
      type: 'string',
      enum: CONTENT_WIDTHS,
      description:
        'How wide the page content column reads. narrow = a tight, book-like measure — literary, focused, luxury prompts. regular = the default. wide = an expansive, dashboard-like measure — technical, data-forward, maximalist prompts.',
    },
    sectionEmphasis: {
      type: 'string',
      enum: SECTION_EMPHASIS,
      description:
        "Which section gets the flagship (larger, asymmetric) tile in its card grid — a visual accent, not a content change. services = the first service gets top billing. work = the first case study gets top billing. none = every tile stays equal weight, which is itself a deliberate restrained choice for calm/minimal prompts.",
    },
  },
}

const SYSTEM = `You are the art director for Altitude's theme console. Altitude is the design system built by Southleft, and this console lives in its Storybook: a visitor types a vibe and you return ONE art direction for the whole component library.

You return NO colors and NO CSS. You return hue, chroma, shape, and motion parameters. A deterministic OKLCH solver downstream derives every token from them and enforces WCAG AA contrast on every text/surface pairing, so you physically cannot ship an inaccessible palette. Pick for character, not for safety — the guardrails are already downstream of you.

Personalities (this is a component library, so personality reads through radii, border weight, elevation and motion — NOT typography; the type scale is fixed and you do not control it):
- editorial: generous internal spacing, subtle radii, hairline borders, flat elevation, smooth motion — print, literary, calm, archival prompts
- brutalist: sharp corners, thick borders, hard flat or deliberately blunt elevation, snappy motion, high contrast — raw, technical, industrial, terminal, blueprint prompts
- geometric: subtle radii, standard borders, crisp subtle elevation, smooth motion — modernist, clean, minimal, systematic, futurist prompts
- luxe: subtle or rounded corners, hairline borders, deep soft shadows, stately motion, hushed chroma — fashion, luxury, hospitality, nocturnal-elegant prompts
- playful: rounded or pill corners, thick borders, lifted chunky shadows, springy motion, high chroma — fun, sweet, arcade, kids, candy prompts

radius, elevation, motion and borderWeight are independent dials — compose them against the personality when the prompt calls for it rather than always taking the family defaults: "minimalist arcade" might be geometric + pill + springy; "cathedral at dawn" might be luxe + sharp + stately + hairline; "air traffic control" might be brutalist + sharp + snappy + thick.

Calibration notes: "stark"/"minimal"/"clean" prompts want geometric, chroma 0.03-0.06, flat elevation, hairline or standard borders, bgTint neutral, mode light — restraint IS the drama there, and piling on shadow undoes it. Prompts that name a WORLD (forest, ocean, desert, candy shop, nightclub) deserve bgTint tinted or vivid — put the visitor inside the color rather than next to it. Choose mode deliberately: flipping the whole library to ink-dark or to paper-white is one of the most dramatic moves you have, so spend it on prompts that earn it instead of defaulting.

secondaryHue is a relationship, not a third opinion: analogous (20-40 degrees off the accent) when the prompt wants harmony, complementary (~180 degrees off) when it wants tension or a genuine two-color system. Only stray further when the prompt names two specific things.

Hue reference: reds ~20-30, oranges ~40-70, yellows ~85-100, greens ~130-160, teals ~180-200, blues ~230-260, violets ~290-310, pinks ~340-355. Neutrals usually take the accent hue or a subtle tilt away from it.

You ALSO return layout intent for one specific page — heroComposition, sectionOrder, gridDensity, contentWidth, sectionEmphasis. Same rule as color: you return small structured dials, never markup or CSS, and a deterministic resolver on the client turns them into real DOM changes while enforcing its own structural invariants (the hero is always first, the footer is always last, the call-to-action never appears before the case studies) — so treat these five fields with the same restraint-not-safety mindset as the color dials. Let personality inform layout the way it informs shape: editorial reads centered/airy/narrow with insights or work given room to breathe; brutalist reads dense/wide with services or work given a blunt flagship tile; luxe reads centered or poster/airy/narrow, unhurried; playful reads poster/dense/wide, high energy. sectionOrder must still serve the prompt's actual priority, not just the personality template — a prompt that is explicitly about proof or credibility should pull "work" earlier; a prompt about staying in touch should pull "cta" earlier (but never ahead of "work", since nobody should be asked to call before they have seen the receipts).

Be literal about the prompt's imagery. The quip is deadpan, lowercase, in the voice of a terminal comment.`

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })

export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'not configured' }, 503)

  let prompt
  try {
    ;({ prompt } = await request.json())
  } catch {
    return json({ error: 'invalid body' }, 400)
  }
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 80) {
    return json({ error: 'prompt must be a 1-80 char string' }, 400)
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: env.THEME_MODEL || 'claude-haiku-4-5',
      // 800 -> 900: T5 (spec 2026-08-20-southleft-example-app) added five
      // layout fields to SCHEMA, the heaviest being `sectionOrder` (six
      // ~2-token enum values echoed back). A modest raise covers that; see
      // the no-thinking rationale below, which is unchanged and still the
      // reason this budget matters at all.
      max_tokens: 900,
      // No `thinking` key at all. On claude-haiku-4-5 omitting it *is* "no
      // thinking" — the explicit { type: 'disabled' } form is only documented
      // for the 4.6+ family, so sending it here would be an unverified
      // parameter for no behavioural gain.
      //
      // We want thinking off: this is a classification-shaped task and the
      // strict schema already guarantees the output shape, whereas an
      // adaptive-thinking model will happily spend the entire budget
      // reasoning about an art direction before writing any JSON (observed on
      // the sibling southleft.com endpoint: 400/400 tokens of thinking, zero
      // answer). That failure surfaces here as stop_reason 'max_tokens' -> 502.
      //
      // Careful with THEME_MODEL: newer models (claude-opus-5, claude-sonnet-5)
      // think by DEFAULT when `thinking` is omitted, and max_tokens caps
      // thinking + output together. Override to one of those and you must also
      // raise max_tokens well above 800 or every response truncates.
      //
      // Also note `output_config` carries only `format` — adding `effort`
      // would error on claude-haiku-4-5.
      system: SYSTEM,
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: `Theme prompt: "${prompt.trim()}"` }],
    }),
  })
  if (!res.ok) return json({ error: 'upstream' }, 502)

  const msg = await res.json()
  if (msg.stop_reason === 'refusal') return json({ error: 'declined' }, 422)
  if (msg.stop_reason === 'max_tokens') return json({ error: 'truncated' }, 502)
  const text = (msg.content || []).find((b) => b.type === 'text')?.text
  let dir
  try {
    dir = JSON.parse(text)
  } catch {
    return json({ error: 'unparseable' }, 502)
  }

  // Server-side clamps — the schema can't express numeric ranges, and the
  // client treats this response as trusted-ish input. Enums other than
  // personality fall through as undefined; the client's seed engine fills
  // the gap from the personality defaults.
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number(n) || 0))
  const hue = (v) => ((clamp(v, -360, 720) % 360) + 360) % 360

  // sectionOrder must be a permutation of the six reorderable ids or the
  // client can't trust it as one — same "enums other than personality fall
  // through as undefined" contract as the fields above, just checked as a
  // set instead of a single membership test. The client-side resolver
  // degrades to its own default order on undefined, never throws.
  const isSectionOrderPermutation =
    Array.isArray(dir.sectionOrder) &&
    dir.sectionOrder.length === SECTION_ORDER_IDS.length &&
    new Set(dir.sectionOrder).size === SECTION_ORDER_IDS.length &&
    dir.sectionOrder.every((id) => SECTION_ORDER_IDS.includes(id))

  return json(
    {
      accentHue: hue(dir.accentHue),
      secondaryHue: hue(dir.secondaryHue),
      neutralHue: hue(dir.neutralHue),
      chroma: clamp(dir.chroma, 0.02, 0.27),
      personality: PERSONALITIES.includes(dir.personality) ? dir.personality : 'geometric',
      mode: MODES.includes(dir.mode) ? dir.mode : undefined,
      bgTint: BG_TINTS.includes(dir.bgTint) ? dir.bgTint : undefined,
      radius: RADII.includes(dir.radius) ? dir.radius : undefined,
      elevation: ELEVATIONS.includes(dir.elevation) ? dir.elevation : undefined,
      motion: MOTIONS.includes(dir.motion) ? dir.motion : undefined,
      borderWeight: BORDER_WEIGHTS.includes(dir.borderWeight) ? dir.borderWeight : undefined,
      name: String(dir.name || '').slice(0, 40),
      quip: String(dir.quip || '').slice(0, 90),
      heroComposition: HERO_COMPOSITIONS.includes(dir.heroComposition) ? dir.heroComposition : undefined,
      sectionOrder: isSectionOrderPermutation ? dir.sectionOrder : undefined,
      gridDensity: GRID_DENSITIES.includes(dir.gridDensity) ? dir.gridDensity : undefined,
      contentWidth: CONTENT_WIDTHS.includes(dir.contentWidth) ? dir.contentWidth : undefined,
      sectionEmphasis: SECTION_EMPHASIS.includes(dir.sectionEmphasis) ? dir.sectionEmphasis : undefined,
    },
    200,
    // Identical prompts are cache-friendly upstream of us too, but POST
    // responses aren't edge-cached; cost control is the tiny max_tokens.
  )
}
