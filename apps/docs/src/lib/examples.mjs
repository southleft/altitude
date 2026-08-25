/**
 * PREVIEW MARKUP — what each component's playground actually renders.
 *
 * THE PROBLEM THIS SOLVES. Everything else on this site is derived from the
 * custom-elements manifest, and the manifest is enough to describe a
 * component's API: its attributes, its slots, its events. It is NOT enough to
 * SHOW one. The manifest says `sl-hero` has a `heading` attribute and an
 * `aside` slot; it cannot say what a heading reads like or what belongs in the
 * aside. So the generated playground mounted `<sl-hero>Hero</sl-hero>` — a
 * component with no heading, no lead, no actions and nothing in its slots,
 * which for a page-section organism renders as an empty box. Reported, exactly
 * right, as "no designs are showing".
 *
 * WHERE THE MARKUP COMES FROM. Not from a second hand-maintained list in this
 * app — that would be the drift this site is built to avoid, and it would not
 * be 1:1 with anything. It comes from the component's OWN Storybook story,
 * `components/<slug>/<slug>.stories.ts`, which is the markup the retired
 * Storybook rendered and is authored beside the component by whoever wrote it.
 * Same source `registry.mjs` already reads for the tier and the lifecycle
 * status; this module reads the story's default export body as well.
 *
 * WHY IT EXECUTES THE STORY RATHER THAN PARSING IT. A first attempt matched
 * the `html` template textually and substituted `${args.x}`. That works until
 * a story writes `${NAV.map(([href, label], i) => html`…`)}` or
 * `${i === 2 ? 'page' : undefined}` — and this library's stories do both, in
 * the header, the footer and the logo wall. Resolving those means evaluating
 * JavaScript, and the only thing that evaluates JavaScript correctly is a
 * JavaScript engine. So the story is EXECUTED, with `html` replaced by a
 * serializer: real `.map()`, real ternaries, real destructuring, and markup
 * that is 1:1 by construction rather than by transcription.
 *
 * HOW THAT IS MADE SAFE. The story is not imported as-is — importing it would
 * pull in the component modules, which call `customElements.define` and import
 * `.scss`, neither of which exists in Node. Instead every `import` is stripped
 * and a serializing `html` is injected in its place (`prelude` below). Nothing
 * from the component graph runs; the story body is evaluated in isolation and
 * all it can do is return a string. TypeScript annotations are handled by Node
 * itself (22.18+ strips types natively), so this costs no new dependency.
 *
 * FAILURE IS "NO EXAMPLE", NEVER BROKEN MARKUP. Every step is wrapped: a story
 * that cannot be found, cannot be evaluated, or uses a binding this serializer
 * does not model returns `null` plus the reason. The playground then falls back
 * to its manifest-only preview and `check-docs-coverage.mjs` reports the gap.
 * A documentation site may say "no example"; it may not show markup that is
 * subtly not what the component does.
 */
import fs from 'node:fs';
import module from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * EXTENSIONLESS TYPESCRIPT, RESOLVED.
 *
 * The fixture modules this extractor deliberately keeps (see `isolate()`)
 * import each other the way TypeScript source always has — `from './lorem'`,
 * with no extension. Node's ESM resolver does not guess extensions, so those
 * imports fail even though Node is perfectly able to strip the types once it
 * has the file. This hook supplies only the guess.
 *
 * Scoped as tightly as a hook can be: it runs ONLY after normal resolution has
 * already thrown, only for relative specifiers, and only when the candidate it
 * would substitute exists on disk. Anything else rethrows the original error,
 * so no other module in the build resolves differently because this ran.
 */
module.registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return stampTypeScript(nextResolve(specifier, context));
    } catch (error) {
      if (!specifier.startsWith('.') || !context.parentURL) throw error;
      const base = fileURLToPath(new URL(specifier, context.parentURL));
      for (const candidate of [`${base}.ts`, path.join(base, 'index.ts')]) {
        if (fs.existsSync(candidate)) {
          return stampTypeScript({ url: pathToFileURL(candidate).href, shortCircuit: true });
        }
      }
      throw error;
    }
  },
});

/**
 * Name the format of a resolved fixture instead of letting Node sniff it.
 *
 * `module-typescript` and not `module`: the first keeps Node's type stripping,
 * the second skips it and the file dies on its first annotation. Saying it out
 * loud also silences the MODULE_TYPELESS_PACKAGE_JSON warning Node prints —
 * once per fixture, in the middle of the build's page list — when a `.ts` file
 * sits under a package.json with no `"type"` and has to be reparsed to find out.
 *
 * Applied only to `.ts` files inside a `fixtures` directory, which is the only
 * thing this module ever asks Node to load.
 */
function stampTypeScript(resolution) {
  if (!resolution?.url?.endsWith('.ts')) return resolution;
  if (!isFixturePath(fileURLToPath(resolution.url))) return resolution;
  return { ...resolution, format: 'module-typescript' };
}

/** Both separators: `path.resolve` yields backslashes on Windows. */
function isFixturePath(candidate) {
  return /[\\/]fixtures([\\/]|$)/.test(candidate);
}

/* ------------------------------------------------------------- the stub */

/**
 * The `html` that replaces Lit's inside an evaluated story.
 *
 * Injected as source text rather than imported, because the story runs as its
 * own isolated module with no import graph at all. It models the four binding
 * forms Lit distinguishes by the character before the `=`, which is the same
 * signal Lit itself uses:
 *
 *   name=${v}    attribute      → name="v"; omitted entirely when v is
 *                                 null/undefined/false, which is what makes
 *                                 `aria-current=${i === 2 ? 'page' : undefined}`
 *                                 come out as "no attribute" and not
 *                                 `aria-current="undefined"`.
 *   ?name=${v}   boolean attr   → the bare name, or nothing
 *   .name=${v}   property       → DROPPED. A property binding sets JS state
 *                                 that static markup cannot carry, so emitting
 *                                 an attribute for it would be a guess. The
 *                                 story is reported as unrepresentable instead.
 *   @name=${v}   event listener → dropped; nothing to serialize, and a preview
 *                                 has no handler to bind to anyway.
 *
 * In child position a value may be a nested template, an array of them (the
 * `.map()` case), or a primitive.
 */
const PRELUDE = `
const __MARK = Symbol.for('altitude.docs.example');
const __esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const __escAttr = (s) => __esc(s).replace(/"/g, '&quot;');
const __unrepresentable = [];
const __SPREAD = Symbol.for('altitude.docs.spread');

const __child = (v) => {
  if (v === null || v === undefined || v === false || v === true) return '';
  if (Array.isArray(v)) return v.map(__child).join('');
  if (v && typeof v === 'object' && v[__MARK]) return v.html;
  return __esc(v);
};

function html(strings, ...values) {
  let out = '';
  for (let i = 0; i < strings.length; i++) {
    let chunk = strings[i];
    if (i >= values.length) { out += chunk; continue; }
    const value = values[i];
    // ELEMENT POSITION: the chunk ends inside an open start tag with no
    // pending attribute name, which is where a spread directive lands.
    if (/<[a-zA-Z][^>]*\\s$/.test(chunk) && value && typeof value === 'object' && value[__SPREAD]) {
      out += chunk;
      for (const [k, v] of Object.entries(value.props)) {
        if (typeof v === 'string' && v.length > 0) out += k + '=\"' + __escAttr(v) + '\" ';
        else if (typeof v === 'boolean' && v) __unrepresentable.push('spread:' + k);
      }
      continue;
    }
    const binding = chunk.match(/([@.?]?)([A-Za-z_:][-\\w:.]*)=$/);
    if (binding) {
      const [whole, prefix, name] = binding;
      out += chunk.slice(0, chunk.length - whole.length);
      if (prefix === '@') continue;
      if (prefix === '.') { __unrepresentable.push('.' + name); continue; }
      if (prefix === '?') { out += value ? name : ''; continue; }
      if (value === null || value === undefined || value === false) continue;
      out += name + '="' + __escAttr(value && value[__MARK] ? value.html : value) + '"';
      continue;
    }
    out += chunk + __child(value);
  }
  return { [__MARK]: true, html: out };
}
const svg = html;

// spread(args) — this library's own Lit directive
// (libs/al-web-components/directives/spread.ts), used in ELEMENT position:
// <al-card \${spread(args)}>. Its string branch sets attributes, which static
// markup carries, so it is modelled. Its boolean branch sets a PROPERTY, which
// markup cannot carry, so those are recorded rather than guessed at.
const spread = (props) => ({ [__SPREAD]: true, props: props || {} });

// Storybook helpers that appear in story files but never run while rendering:
// withActions is a decorator; expect/within/userEvent belong to play functions.
// Stubbed so the module evaluates. Never invoked, so no stub can reach the markup.
const withActions = () => {};
const expect = () => ({});
const within = () => ({});
const userEvent = {};
const action = () => () => {};

export const __issues = __unrepresentable;
`;

/* --------------------------------------------------------- the transform */

/**
 * Story source → a module that can be evaluated on its own.
 *
 * Every import goes. Three kinds appear in these files and all three are
 * either unnecessary or actively harmful here: the component's own module
 * (`./hero`) and its dependencies register custom elements and import `.scss`;
 * `@storybook/web-components` is imported for types only; and `lit` supplies
 * the `html` the prelude is replacing.
 */
function isolate(source, storyDir) {
  const drop = (text) =>
    text
      .replace(/^\s*import\s+type\s+[\s\S]*?from\s*['"][^'"]+['"];?\s*$/gm, '')
      .replace(/^\s*import\s*['"][^'"]+['"];?\s*$/gm, '');

  /*
   * FIXTURES ARE KEPT, NOT DROPPED.
   *
   * `.storybook/fixtures` is this library's shared CONTENT module — deterministic
   * lorem, placeholder image URLs, the Southleft site data. It is plain
   * TypeScript with no DOM and no side effects, it is what most stories put on
   * screen, and stubbing it would mean inventing the words a story chose. Five
   * components (card, text-block, tab-panel, textarea, and the table's copy)
   * rendered nothing purely because this import was being stripped with the
   * rest.
   *
   * The specifier has to be rewritten: the isolated module is evaluated from a
   * temp directory, so a relative path no longer points anywhere. It is
   * resolved against the STORY's directory and re-emitted as an absolute file
   * URL, which is also what stops this becoming a way to import arbitrary
   * modules — only paths that land inside a `fixtures` directory survive.
   */
  const named = /^\s*import\s+([\s\S]*?)\s*from\s*['"]([^'"]+)['"];?\s*$/gm;
  const rewritten = source.replace(named, (whole, clause, specifier) => {
    if (!specifier.startsWith('.')) return '';
    const resolved = resolveFixture(path.resolve(storyDir, specifier));
    if (!resolved) return '';
    return `import ${clause} from ${JSON.stringify(pathToFileURL(resolved).href)};`;
  });

  return `${PRELUDE}\n${drop(rewritten)}`;
}

/**
 * A relative story import, resolved to a real file — but only when it is a
 * fixture. Anything else (a component module, a directive, an icon registry)
 * returns null and is dropped, because evaluating it would pull in DOM APIs and
 * `.scss` that do not exist here.
 */
function resolveFixture(base) {
  // Both separators: `path.resolve` yields backslashes on Windows.
  if (!isFixturePath(base)) return null;
  const candidates = [base, `${base}.ts`, `${base}.mts`, `${base}.js`,
    path.join(base, 'index.ts'), path.join(base, 'index.mts'), path.join(base, 'index.js')];
  return candidates.find((candidate) => {
    try {
      return fs.statSync(candidate).isFile();
    } catch {
      return false;
    }
  }) ?? null;
}

/* ------------------------------------------------------------ evaluation */

/**
 * Which story to show. `Default` by name when it exists — every story file in
 * this repo leads with one, and it is by convention the component as the
 * product actually ships it. Otherwise the first exported story, so a file that
 * names its stories differently still gets a preview rather than nothing.
 */
function pickStory(module) {
  /*
   * TWO STORY FORMATS, both live in this repo.
   *
   * CSF3 (the brand layer): `export const Default = { args, render(args) }`.
   * CSF2 (the base library): `const Template = (args) => html\`…\`;
   * export const Default = Template.bind({}); Default.args = {}` — the story
   * IS the render function, and `render` sits on nothing. A CSF3 story may also
   * omit `render` and inherit the default export's, which is a third shape.
   *
   * Normalising all three here is what lets one extractor serve both
   * libraries; keying off only `.render` silently skipped 23 base components.
   */
  const meta = module.default ?? {};
  const normalize = (value) => {
    /*
     * `meta.args` is merged for CSF2 too, but only its PRIMITIVE entries.
     *
     * A CSF2 story sets just what it overrides (`Disabled.args = { isDisabled:
     * true }`) and inherits label, placeholder and fieldNote from the default
     * export, so reading `value.args` alone rendered every CSF2 component
     * stripped of its own example content — no label, no placeholder, no field
     * note. (The same omission in the accessibility fixture hid a real 2.4:1
     * contrast failure on `al-select`'s disabled field note.)
     *
     * Only STRINGS and NUMBERS are inherited. `spread()` renders a boolean or
     * an object as a PROPERTY binding, which this serializer correctly refuses
     * to guess at — inheriting `isActive: false` from a default export marked
     * al-alert, al-toast, al-tab-panel and al-file-upload unrepresentable and
     * cost them their previews outright. A string becomes an attribute and
     * survives static markup; a boolean-as-property never could, and it is not
     * what was missing anyway. The gap this closes is textual: the label,
     * placeholder and field note a CSF2 story inherits and never restates.
     */
    if (typeof value === 'function') {
      const inherited = Object.fromEntries(
        Object.entries(meta.args ?? {}).filter(
          ([, v]) => typeof v === 'string' || typeof v === 'number',
        ),
      );
      return { render: value, args: { ...inherited, ...(value.args ?? {}) } };
    }
    if (value && typeof value === 'object') {
      const render = typeof value.render === 'function' ? value.render : meta.render;
      if (typeof render === 'function') return { render, args: { ...(meta.args ?? {}), ...(value.args ?? {}) } };
    }
    return null;
  };

  const candidates = Object.entries(module)
    .filter(([name]) => name !== 'default' && !name.startsWith('__'))
    .map(([name, value]) => [name, normalize(value)])
    .filter(([, story]) => story !== null);

  if (!candidates.length) return null;
  return candidates.find(([name]) => name === 'Default') ?? candidates[0];
}

/**
 * Temp modules are written to one directory per process and imported by URL.
 * A file is needed rather than a `data:` URL because Node's TypeScript
 * stripping is keyed off the file extension — `.mts` also pins the module
 * format, which avoids a reparse warning on every story.
 */
let scratchDir = null;
function scratch() {
  if (!scratchDir) scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), 'altitude-docs-examples-'));
  return scratchDir;
}

/* ------------------------------------------------------------- the styles */

/**
 * A story's fixture styles, confined to the preview.
 *
 * Stories carry `<style>` blocks for the markup they slot in — `.chip`,
 * `.term`, `.logo-wall__item`. Injected as-is into a documentation page those
 * are global rules with names general enough to collide with the site's own
 * (`.chip` against `.chip-tag`, `.term` against nothing yet but plausibly
 * later). Each selector is therefore prefixed with the preview container's
 * attribute, which confines the rule to the stage without touching what the
 * story wrote.
 *
 * Deliberately a small transform, not a CSS parser: it handles the flat rule
 * lists these fixtures contain. At-rules are left alone — none of the current
 * fixtures uses one, and a mangled `@media` would be worse than an unscoped
 * one, so the conservative branch is to pass it through untouched.
 */
function scopeStyles(css, scope) {
  return css.replace(/(^|[}])([^{}@]+)\{/g, (whole, before, selectors) => {
    const scoped = selectors
      .split(',')
      .map((selector) => {
        const trimmed = selector.trim();
        if (!trimmed) return selector;
        return `${scope} ${trimmed}`;
      })
      .join(', ');
    return `${before}${scoped}{`;
  });
}

/**
 * Cosmetic tidy-up of the serialized markup.
 *
 * A `spread(args)` over empty args contributes nothing, leaving the space that
 * separated it from the tag name: `<al-button >Label</al-button>`. It renders
 * identically, but the snippet beneath the stage is meant to be copied, and
 * copy that a reader would have to clean up reads as a generator artefact.
 * Narrowly scoped to whitespace between a tag's last token and its closing
 * bracket, so nothing in text content is touched.
 */
function tidy(markup) {
  return markup.replace(/(<[a-zA-Z][\w-]*(?:\s+[^<>]*?[^<>\s])?)\s+(\/?)>/g, '$1$2>');
}

/** Pull `<style>` blocks out of the rendered markup so they can be scoped. */
function splitStyles(markup, scope) {
  const blocks = [];
  const html = markup.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => {
    blocks.push(scopeStyles(css, scope));
    return '';
  });
  return { html: html.trim(), styles: blocks.join('\n').trim() };
}

/* ---------------------------------------------------------------- the API */

const CACHE = new Map();
const SCOPE = '[data-pg-example]';

/**
 * The preview for one component, or `null` with a reason.
 *
 * @param {{slug: string, libraryRoot: string, tag: string}} component
 * @returns {Promise<{html: string, styles: string, story: string, source: string} | null>}
 */
export async function exampleFor(component) {
  const key = `${component.libraryRoot}::${component.slug}`;
  if (CACHE.has(key)) return CACHE.get(key);

  const result = await build(component).catch((error) => ({
    ok: false,
    reason: `story threw while rendering: ${error.message}`,
  }));
  CACHE.set(key, result);
  return result;
}

async function build(component) {
  const source = path.join(
    component.libraryRoot,
    'components',
    component.slug,
    `${component.slug}.stories.ts`,
  );

  let text;
  try {
    text = fs.readFileSync(source, 'utf8');
  } catch {
    return { ok: false, reason: 'no stories file beside the component' };
  }

  const file = path.join(scratch(), `${component.slug}-${Date.now()}.mts`);
  fs.writeFileSync(file, isolate(text, path.dirname(source)), 'utf8');

  let module;
  try {
    module = await import(pathToFileURL(file).href);
  } catch (error) {
    return { ok: false, reason: `story did not evaluate in isolation: ${error.message}` };
  } finally {
    try {
      fs.unlinkSync(file);
    } catch {
      /* best effort — the whole scratch dir is temporary anyway. */
    }
  }

  const picked = pickStory(module);
  if (!picked) return { ok: false, reason: 'no exported story with a render function' };
  const [storyName, story] = picked;

  const rendered = story.render(story.args, {});
  const markup = rendered && typeof rendered === 'object' ? rendered.html : String(rendered ?? '');
  if (!markup || !markup.trim()) return { ok: false, reason: `story "${storyName}" rendered empty` };

  // A property binding means the story's real output depends on JS state this
  // preview cannot carry. Better no example than one that looks right and is not.
  if (module.__issues?.length) {
    return {
      ok: false,
      reason: `story "${storyName}" uses property bindings (${[...new Set(module.__issues)].join(', ')}) that static markup cannot carry`,
    };
  }

  const { html, styles } = splitStyles(tidy(markup), SCOPE);
  if (!html.includes(`<${component.tag}`)) {
    return { ok: false, reason: `story "${storyName}" does not render <${component.tag}>` };
  }

  return { ok: true, html, styles, story: storyName, source };
}

/**
 * Every component's example status, for the gate. Resolved in parallel — each
 * one is a file read plus a module evaluation, and they are independent.
 */
export async function exampleReport(components) {
  const rows = await Promise.all(
    components.map(async (component) => ({
      tag: component.tag,
      tier: component.tier,
      ...(await exampleFor(component)),
    })),
  );
  return {
    withExample: rows.filter((row) => row.ok),
    without: rows.filter((row) => !row.ok),
  };
}
