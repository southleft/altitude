/* eslint-disable */
/**
 * measure-lib.js — injected into the harness page.
 *
 *   window.__spec(state)   full spec of every case in a given interaction state
 *
 * TOKEN PROVENANCE — the important part
 * -------------------------------------
 * Earlier passes recovered tokens by matching a computed colour back to the token
 * table. That is guesswork: dozens of tokens share a hex, and it cannot recover a
 * SPACING or RADIUS token at all (16 is four different tokens).
 *
 * But the component CSS already names its tokens:
 *
 *     .al-c-button { background-color: var(--al-theme-color-background-primary-default); }
 *
 * So instead of inferring, we READ the authored declaration off the matching CSS rule
 * and take the custom-property name verbatim. `--al-theme-color-background-primary-default`
 * maps 1:1 to the Figma variable `theme/color/background/primary-default`. Exact, not
 * inferred, and it works for colour, spacing, radius and border width alike.
 *
 * INTERACTION STATES
 * ------------------
 * Hover / Focus / Active / Disabled are CSS pseudo-classes, invisible to
 * getComputedStyle. We do NOT try to make the browser apply them — an injected sheet
 * loses to `@layer al.component`, and inline styles behaved unreliably. We only need
 * to know WHICH rules would match, so we rewrite the pseudo to a class, add that class,
 * and test `el.matches(...)`. The authored declarations of the matching rules are the
 * state delta; their token names resolve against the token table on the Node side.
 */
(function () {
  const FORCE = '__al_forced';
  const STATE_PSEUDO = {
    default: [],
    hover: [':hover'],
    focus: [':focus-visible', ':focus'],
    active: [':active'],
    disabled: [':disabled'],
  };

  /**
   * Properties worth carrying into Figma.
   *
   * Shorthands are included on purpose. `padding: var(--al-theme-space-xs) var(--al-theme-space-@)`
   * is how the SCSS actually authors spacing, and reading only the longhands returns ''
   * for it — losing exactly the spacing/radius tokens we need. `expand()` below splits
   * a shorthand back into sides/corners while keeping each `var()` intact.
   */
  const PROPS = [
    'background-color', 'color', 'opacity', 'box-shadow',
    'border-top-color', 'border-top-width', 'border-top-style',
    'border-top-left-radius', 'border-top-right-radius',
    'border-bottom-right-radius', 'border-bottom-left-radius',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    // LOGICAL padding — the library authors these, not the physical longhands, in 27 of
    // its components (list-item, menu-item, input, chip, field-note, tab-panel, …).
    // Reading only the physical names returns '' for every one of them, so the spacing
    // token was never recorded and the component generated into Figma with NO PADDING.
    // That is the single largest reason a generated set "looks nothing like the app"
    // (found 2026-08-27 via al-list-item: `padding-block-start: var(--al-theme-space-xs)`
    // at list-item.scss:43-46 produced a contract whose link node bound no padding at
    // all). expand() below folds these onto the physical sides.
    'padding-block-start', 'padding-block-end', 'padding-inline-start', 'padding-inline-end',
    'padding-block', 'padding-inline',
    'gap', 'column-gap', 'row-gap',
    'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
    'text-decoration-line', 'text-transform',
    'outline-color', 'outline-width', 'outline-style', 'outline-offset',
    'width', 'height', 'min-width', 'min-height',
    // shorthands
    'padding', 'border-radius', 'border', 'border-width', 'border-color', 'border-style',
    'outline', 'font',
    // `background:` (not -color) is how 38 declarations across 19 components author
    // their fill token (e.g. toggle-button's hover). Probing only the longhand
    // returns '' for them — the token vanishes.
    'background',
  ];

  /** Longhand -> the shorthand it may have come from, for !important inheritance. */
  const SHORTHAND_OF = {
    'background-color': 'background',
    'padding-top': 'padding', 'padding-right': 'padding', 'padding-bottom': 'padding', 'padding-left': 'padding',
    'border-top-left-radius': 'border-radius', 'border-top-right-radius': 'border-radius',
    'border-bottom-right-radius': 'border-radius', 'border-bottom-left-radius': 'border-radius',
    'border-top-width': 'border', 'border-top-style': 'border', 'border-top-color': 'border',
    'outline-width': 'outline', 'outline-style': 'outline', 'outline-color': 'outline',
    'row-gap': 'gap', 'column-gap': 'gap',
  };

  /** Split a shorthand on top-level whitespace, keeping `var(a, b)` groups whole. */
  function parts(value) {
    const out = [];
    let depth = 0, cur = '';
    for (const ch of value) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (/\s/.test(ch) && depth === 0) { if (cur) { out.push(cur); cur = ''; } continue; }
      cur += ch;
    }
    if (cur) out.push(cur);
    return out;
  }

  /** CSS 1-to-4 value expansion -> [top, right, bottom, left]. */
  function box(p) {
    if (p.length === 1) return [p[0], p[0], p[0], p[0]];
    if (p.length === 2) return [p[0], p[1], p[0], p[1]];
    if (p.length === 3) return [p[0], p[1], p[2], p[1]];
    return [p[0], p[1], p[2], p[3]];
  }

  /**
   * Split a `border` / `outline` shorthand into width / style / colour.
   *
   * A naive classifier assigns anything that is not a literal length or a style keyword
   * to COLOUR — which is wrong here, because the values are `var()` references:
   *   outline: var(--al-theme-border-width-md) solid var(--al-theme-color-focus-ring, …)
   * would record the WIDTH token as the outline colour. The token names say which is
   * which, so use them, and fall back to CSS shorthand order (width style colour).
   */
  function classifyBorder(segs) {
    const out = {};
    const rest = [];
    for (const seg of segs) {
      if (/^(solid|dashed|dotted|none|hidden|double|auto)$/.test(seg)) { out.style = seg; continue; }
      if (/^[\d.]+(px|rem|em)$/.test(seg) || /^(thin|medium|thick)$/.test(seg)) { out.width = seg; continue; }
      if (/var\(\s*--al-[a-z0-9-]*-width/i.test(seg)) { out.width = seg; continue; }
      if (/var\(\s*--al-[a-z0-9-]*-color|var\(\s*--al-color/i.test(seg)) { out.color = seg; continue; }
      rest.push(seg);
    }
    for (const seg of rest) {
      if (!out.width) out.width = seg;
      else if (!out.color) out.color = seg;
    }
    return out;
  }

  /** Rewrite shorthands into the longhands the Figma builder consumes. */
  function expand(auth) {
    const out = { ...auth };
    // LOGICAL -> PHYSICAL padding, applied BEFORE the `padding` shorthand below so a
    // logical longhand beats the shorthand (it is the more specific declaration), while
    // an explicitly authored PHYSICAL longhand still beats both (it is already in `out`
    // and every assignment here is `||`-guarded).
    //
    // LTR is assumed: `inline-start` -> left, `inline-end` -> right. This library ships
    // no RTL sheet and Figma auto-layout padding is physical, so there is nothing to
    // carry a direction-aware value into. If RTL is ever added, this is the seam.
    if (out['padding-block']) {
      const p = parts(out['padding-block']);
      const [t, b] = p.length === 1 ? [p[0], p[0]] : [p[0], p[1]];
      out['padding-top'] = out['padding-top'] || t;
      out['padding-bottom'] = out['padding-bottom'] || b;
    }
    if (out['padding-inline']) {
      const p = parts(out['padding-inline']);
      const [s, e] = p.length === 1 ? [p[0], p[0]] : [p[0], p[1]];
      out['padding-left'] = out['padding-left'] || s;
      out['padding-right'] = out['padding-right'] || e;
    }
    if (out['padding-block-start']) out['padding-top'] = out['padding-top'] || out['padding-block-start'];
    if (out['padding-block-end']) out['padding-bottom'] = out['padding-bottom'] || out['padding-block-end'];
    if (out['padding-inline-start']) out['padding-left'] = out['padding-left'] || out['padding-inline-start'];
    if (out['padding-inline-end']) out['padding-right'] = out['padding-right'] || out['padding-inline-end'];
    // Drop the logical names once folded: they are an AUTHORING detail, and everything
    // downstream (token-map's CSS_TO_TOKEN, the Figma auto-layout emitters) speaks
    // physical sides only. Leaving them in would add anatomy keys that resolve to a null
    // Figma variable and read as unmapped tokens.
    for (const k of ['padding-block', 'padding-inline', 'padding-block-start', 'padding-block-end', 'padding-inline-start', 'padding-inline-end']) delete out[k];
    if (out.padding) {
      const [t, r, b, l] = box(parts(out.padding));
      out['padding-top'] = out['padding-top'] || t;
      out['padding-right'] = out['padding-right'] || r;
      out['padding-bottom'] = out['padding-bottom'] || b;
      out['padding-left'] = out['padding-left'] || l;
    }
    if (out['border-radius']) {
      const [tl, tr, br, bl] = box(parts(out['border-radius']));
      out['border-top-left-radius'] = out['border-top-left-radius'] || tl;
      out['border-top-right-radius'] = out['border-top-right-radius'] || tr;
      out['border-bottom-right-radius'] = out['border-bottom-right-radius'] || br;
      out['border-bottom-left-radius'] = out['border-bottom-left-radius'] || bl;
    }
    if (out.border) {
      const c = classifyBorder(parts(out.border));
      if (c.width) out['border-top-width'] = c.width;
      if (c.style) out['border-top-style'] = c.style;
      if (c.color) out['border-top-color'] = c.color;
    }
    if (out['border-width']) out['border-top-width'] = out['border-top-width'] || box(parts(out['border-width']))[0];
    if (out['border-color']) out['border-top-color'] = out['border-top-color'] || box(parts(out['border-color']))[0];
    if (out['border-style']) out['border-top-style'] = out['border-top-style'] || box(parts(out['border-style']))[0];
    if (out.gap) {
      const p = parts(out.gap);
      out['row-gap'] = out['row-gap'] || p[0];
      out['column-gap'] = out['column-gap'] || (p[1] || p[0]);
    }
    if (out.outline) {
      const c = classifyBorder(parts(out.outline));
      if (c.width) out['outline-width'] = c.width;
      if (c.style) out['outline-style'] = c.style;
      if (c.color) out['outline-color'] = c.color;
    }
    if (out.background && !out['background-color']) {
      // Single-colour `background: var(--al-theme-color-…)` becomes the fill token.
      // Gradients (skeleton, list fades, range track) are kept under background-image
      // instead — binding a gradient's first var() as a SOLID fill would be a lie.
      if (/gradient|url\(/i.test(out.background)) out['background-image'] = out.background;
      else out['background-color'] = out.background;
    }
    for (const k of Object.keys(out)) if (out[k] === '') delete out[k];
    return out;
  }

  const hosts = () => [...document.querySelectorAll('.case')].map((w) => w.firstElementChild).filter(Boolean);

  function shadowRoots(node, out) {
    out = out || [];
    const walk = (n) => {
      if (n.shadowRoot) { out.push(n.shadowRoot); for (const c of n.shadowRoot.querySelectorAll('*')) walk(c); }
      for (const c of n.children || []) walk(c);
    };
    walk(node);
    return out;
  }

  /** Flatten a shadow root's rules to [{sel, style, order}], honouring @media. */
  function rulesOf(sr) {
    const out = [];
    let order = 0;
    const visit = (rule) => {
      if (rule.cssRules && !rule.selectorText) {
        if (rule.media && !window.matchMedia(rule.media.mediaText).matches) return;
        for (const r of rule.cssRules) visit(r);
        return;
      }
      if (!rule.selectorText) return;
      out.push({ sel: rule.selectorText, style: rule.style, order: order++ });
    };
    for (const sheet of sr.adoptedStyleSheets || []) {
      let top;
      try { top = sheet.cssRules; } catch (e) { continue; }
      for (const r of top) visit(r);
    }
    return out;
  }

  /** Approximate specificity: [ids, classes+pseudo-classes+attrs, elements]. */
  function spec(sel) {
    const s = sel.replace(/::[a-z-]+/g, '');
    const ids = (s.match(/#[\w-]+/g) || []).length;
    const cls = (s.match(/\.[\w-]+|\[[^\]]+\]|:(?!not|is|where)[\w-]+/g) || []).length;
    const els = (s.match(/(^|[\s>+~(])[a-z][\w-]*/gi) || []).length;
    return ids * 10000 + cls * 100 + els;
  }

  /**
   * Authored declarations that apply to `el`, last-wins by (specificity, order).
   * Returns { prop: authoredValue } where authoredValue may be `var(--al-…)`.
   */
  function authored(el, rules) {
    const best = {};
    for (const r of rules) {
      let hit = false;
      try { hit = el.matches(r.sel); } catch (e) { continue; }
      if (!hit) continue;
      const rank = spec(r.sel) * 100000 + r.order;
      // Iterating a CSSStyleDeclaration yields LONGHANDS. When a shorthand contains a
      // var() the browser cannot expand it at parse time — the longhands become
      // "pending substitution" and getPropertyValue returns ''. So probe the shorthands
      // explicitly too, otherwise `padding: var(--hook, var(--tok) var(--tok))` is lost.
      const decl = {};
      for (const prop of new Set([...r.style, ...PROPS])) {
        if (!PROPS.includes(prop)) continue;
        const value = r.style.getPropertyValue(prop).trim();
        if (value) decl[prop] = unwrapVar(el, value);
      }
      // Expand PER RULE, before merging. Expanding after the merge lets a base rule's
      // `border: none` longhands outrank a more specific rule's `border:` shorthand,
      // which is exactly how the tertiary button lost its border.
      const expanded = expand(decl);
      for (const [prop, value] of Object.entries(expanded)) {
        // !important is PER DECLARATION, not per rule. Computing it per rule meant a
        // single `!important` anywhere in `.al-c-button` promoted every property in that
        // rule above all others — which is why the base rule kept beating the hover and
        // variant rules no matter how specificity was ranked.
        const prio = r.style.getPropertyPriority(prop) === 'important'
          || (SHORTHAND_OF[prop] && r.style.getPropertyPriority(SHORTHAND_OF[prop]) === 'important');
        (best[prop] = best[prop] || []).push({ value, score: (prio ? 1e12 : 0) + rank });
      }
    }
    for (const k of Object.keys(best)) best[k].sort((a, b) => b.score - a.score);
    return best; // { prop: [{value, score}, …] highest-ranked first }
  }

  /**
   * Choose among candidate declarations using the COMPUTED value as arbiter.
   *
   * Emulating the cascade exactly (layers, specificity ties, shorthand-vs-longhand
   * precedence) is a rabbit hole — a base `border: none` kept beating a more specific
   * `border: var(--tok) solid var(--tok)` no matter how the ranking was tweaked. But the
   * browser has already done the cascade for us: `getComputedStyle` IS the answer.
   *
   * So: rank is only a hint. The winner is the highest-ranked candidate whose resolved
   * value actually equals what the browser computed. That makes token recovery immune
   * to cascade-emulation bugs, and any property where no candidate matches is reported
   * rather than silently guessed.
   */
  const ROOT_PX = 16;

  /** Colour -> [r,g,b,a] 0-255, from `#rgb`, `#rrggbb[aa]` or `rgb()/rgba()`. */
  function asColor(v) {
    const s = String(v).trim();
    let m = s.match(/^#([0-9a-f]{3,8})$/i);
    if (m) {
      let h = m[1];
      if (h.length === 3) h = h.split('').map((c) => c + c).join('');
      if (h.length === 6) h += 'ff';
      if (h.length !== 8) return null;
      return [0, 2, 4, 6].map((i) => parseInt(h.slice(i, i + 2), 16));
    }
    m = s.match(/^rgba?\(([^)]+)\)$/i);
    if (m) {
      const p = m[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat);
      return [Math.round(p[0]), Math.round(p[1]), Math.round(p[2]), Math.round((p[3] === undefined ? 1 : p[3]) * 255)];
    }
    return null;
  }

  /** Length -> px number. Handles px / rem / em / unitless. */
  function asPx(v, el) {
    const s = String(v).trim();
    let m = s.match(/^(-?[\d.]+)px$/);
    if (m) return parseFloat(m[1]);
    m = s.match(/^(-?[\d.]+)rem$/);
    if (m) return parseFloat(m[1]) * ROOT_PX;
    m = s.match(/^(-?[\d.]+)em$/);
    if (m) return parseFloat(m[1]) * parseFloat(getComputedStyle(el).fontSize);
    m = s.match(/^(-?[\d.]+)$/);
    if (m) return parseFloat(m[1]);
    return null;
  }

  /**
   * Do a candidate's resolved value and the browser's computed value agree?
   * They are rarely string-identical: a token holds `#4375ff` while the computed style
   * reports `rgb(67, 117, 255)`, and `1rem` computes to `16px`. Compare by TYPE.
   */
  function sameValue(el, resolved, target) {
    const rc = asColor(resolved), tc = asColor(target);
    if (rc && tc) return rc[0] === tc[0] && rc[1] === tc[1] && rc[2] === tc[2] && Math.abs(rc[3] - tc[3]) <= 1;
    const rp = asPx(resolved, el), tp = asPx(target, el);
    if (rp !== null && tp !== null) return Math.abs(rp - tp) < 0.5;
    return String(resolved).trim().toLowerCase() === String(target).trim().toLowerCase();
  }

  function pick(el, candidates, computedValue) {
    if (!candidates || !candidates.length) return null;
    const cs = getComputedStyle(el);
    for (const c of candidates) {
      const m = c.value.match(/var\(\s*(--[a-z0-9-]+)/i);
      const resolved = m ? cs.getPropertyValue(m[1]).trim() : c.value;
      if (sameValue(el, resolved, computedValue)) return c;
    }
    return null;
  }

  /**
   * Resolve a `var()` fallback chain down to the declaration that actually applies.
   *
   * The SCSS routes almost everything through a per-component override hook:
   *   padding: var(--al-button-padding, var(--al-theme-space-xs) var(--al-theme-space));
   * `--al-button-padding` is deliberately undefined, so the REAL tokens live in the
   * fallback. Taking the first `var()` name would record `button-padding` — a hook, not
   * a token — and lose the spacing entirely. So: if the custom property is defined on
   * this element, that is the token; otherwise recurse into the fallback.
   */
  function unwrapVar(el, value, depth) {
    depth = depth || 0;
    if (typeof value !== 'string' || depth > 6) return value;
    // Scan LEFT-TO-RIGHT, consuming each var() exactly once. The earlier version
    // re-recursed on the whole string from index 0, so an already-resolved first
    // var() burned one depth level per pass and the depth cap was hit before any
    // LATER var() in the same shorthand was reached — which is how
    // `outline: var(width) solid var(--al-theme-color-focus-ring, fallback)` kept
    // the undefined focus-ring hook instead of unwrapping to its fallback token.
    let out = '';
    let rest = value;
    for (;;) {
      const i = rest.indexOf('var(');
      if (i === -1) { out += rest; break; }
      out += rest.slice(0, i);
      let d = 0, end = -1;
      for (let j = i; j < rest.length; j++) {
        if (rest[j] === '(') d++;
        else if (rest[j] === ')') { d--; if (d === 0) { end = j; break; } }
      }
      if (end === -1) { out += rest.slice(i); break; }
      const inner = rest.slice(i + 4, end);
      const comma = (() => { let dd = 0; for (let j = 0; j < inner.length; j++) { const c = inner[j]; if (c === '(') dd++; else if (c === ')') dd--; else if (c === ',' && dd === 0) return j; } return -1; })();
      const name = (comma === -1 ? inner : inner.slice(0, comma)).trim();
      const fallback = comma === -1 ? '' : inner.slice(comma + 1).trim();
      const defined = getComputedStyle(el).getPropertyValue(name).trim();
      out += defined !== '' ? 'var(' + name + ')' : unwrapVar(el, fallback, depth + 1);
      rest = rest.slice(end + 1);
    }
    return out;
  }

  /** `var(--al-theme-color-background-primary-default)` -> `theme-color-background-primary-default`. */
  function tokenOf(value) {
    if (typeof value !== 'string') return null;
    const m = value.match(/var\(\s*--al-([a-z0-9-]+)/i);
    return m ? m[1] : null;
  }

  const px = (v) => (typeof v === 'string' && v.endsWith('px') ? parseFloat(v) : v);

  function describe(el, rootBox, rules, arbitrate) {
    const cs = getComputedStyle(el);
    const b = el.getBoundingClientRect();
    const cands = authored(el, rules);
    // Computed values, keyed the same way as the candidate properties, so `pick()` can
    // arbitrate each one against what the browser actually resolved.
    const computedFor = {
      'background-color': cs.backgroundColor, 'color': cs.color, 'opacity': cs.opacity,
      'border-top-width': cs.borderTopWidth, 'border-top-color': cs.borderTopColor,
      'border-top-left-radius': cs.borderTopLeftRadius, 'border-top-right-radius': cs.borderTopRightRadius,
      'border-bottom-right-radius': cs.borderBottomRightRadius, 'border-bottom-left-radius': cs.borderBottomLeftRadius,
      'padding-top': cs.paddingTop, 'padding-right': cs.paddingRight,
      'padding-bottom': cs.paddingBottom, 'padding-left': cs.paddingLeft,
      'column-gap': cs.columnGap === 'normal' ? '0px' : cs.columnGap,
      'row-gap': cs.rowGap === 'normal' ? '0px' : cs.rowGap,
      'font-size': cs.fontSize, 'font-weight': cs.fontWeight, 'line-height': cs.lineHeight,
      'letter-spacing': cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing,
      'outline-width': cs.outlineWidth, 'outline-color': cs.outlineColor, 'outline-offset': cs.outlineOffset,
    };
    const auth = {};
    const tokens = {};
    const unmatched = [];
    for (const [prop, list] of Object.entries(cands)) {
      const expected = computedFor[prop];
      // Properties we cannot read back (shorthands, style keywords) keep the top-ranked
      // candidate; everything else is arbitrated against the computed value.
      // Arbitration only works for the DEFAULT state: for hover/focus/active/disabled
      // the browser's computed value is still the default one (we never apply the
      // pseudo-class), so it would reject the state's own rule. When it cannot decide,
      // fall back to the highest-ranked candidate.
      // Only the DEFAULT state may be arbitrated. In hover/focus/active/disabled the
      // computed value is still the default, so arbitration would actively pick the BASE
      // rule over the state's own rule — the exact opposite of what we want.
      let chosen = (arbitrate && expected !== undefined) ? pick(el, list, expected) : null;
      if (!chosen) { chosen = list[0]; if (arbitrate && expected !== undefined) unmatched.push(prop); }
      auth[prop] = chosen.value;
      const t = tokenOf(chosen.value);
      if (t) tokens[prop] = t;
    }
    return {
      tag: el.tagName.toLowerCase(),
      cls: (typeof el.className === 'string' ? el.className : '').split(' ').filter((c) => c && c !== FORCE).join(' '),
      x: Math.round((b.left - rootBox.left) * 100) / 100,
      y: Math.round((b.top - rootBox.top) * 100) / 100,
      w: Math.round(b.width * 100) / 100,
      h: Math.round(b.height * 100) / 100,
      computed: {
        // `dir` is flex-direction, which computes to its initial value 'row'
        // on every NON-flex element — meaningless there. Consumers must gate
        // it on `display` (see layoutAxisFor in build-set-code.mjs).
        display: cs.display, dir: cs.flexDirection, align: cs.alignItems, justify: cs.justifyContent,
        // Recorded only when it actually wraps: `nowrap` is the initial value
        // on every element, so storing it unconditionally would add a dead
        // key to all ~680 anatomy nodes in the contract set.
        wrap: cs.flexWrap === 'wrap' || cs.flexWrap === 'wrap-reverse' ? cs.flexWrap : null,
        // flex-grow, recorded only when non-zero (same discipline as `wrap`:
        // 0 is the initial value on every element). This is the ONE CSS fact
        // that means "fill the container" — without it a generator can only
        // hug, which is the top recurring defect in the generated Figma sets
        // (a filling message renders at its max-content width and overflows).
        grow: (parseFloat(cs.flexGrow) || 0) > 0 ? (parseFloat(cs.flexGrow) || 0) : null,
        // align-self, recorded only when the child OVERRIDES its parent's
        // cross-axis alignment ('auto' is the initial value on every element,
        // 'normal' the resolved default — same null-at-initial discipline as
        // wrap/grow). Consumers combine it with the PARENT's align: a child
        // that opts out of stretch (align-self: flex-start) must not FILL
        // even under a stretching parent (spec 2026-08-28-layout-fill-and-
        // grow-facts).
        alignSelf: cs.alignSelf && cs.alignSelf !== 'auto' && cs.alignSelf !== 'normal' ? cs.alignSelf : null,
        pos: cs.position, vis: cs.visibility, opacityRaw: cs.opacity,
        gap: cs.columnGap === 'normal' ? 0 : px(cs.columnGap),
        pad: [px(cs.paddingTop), px(cs.paddingRight), px(cs.paddingBottom), px(cs.paddingLeft)],
        bg: cs.backgroundColor, fc: cs.color,
        // The hero's whole backdrop is a repeating gradient LATTICE, not a fill.
        // Probing only background-color loses it and the section reads as flat black.
        bgImage: cs.backgroundImage && cs.backgroundImage !== 'none' ? cs.backgroundImage : null,
        bgSize: cs.backgroundSize && cs.backgroundSize !== 'auto' ? cs.backgroundSize : null,
        bw: px(cs.borderTopWidth), bc: cs.borderTopColor, bstyle: cs.borderTopStyle,
        // Per-side border widths (footer round 3): a divider is border-top
        // ONLY — collapsing to the top width rendered full boxes around the
        // footer's quote and legal rows.
        bw4: [px(cs.borderTopWidth), px(cs.borderRightWidth), px(cs.borderBottomWidth), px(cs.borderLeftWidth)],
        r: [px(cs.borderTopLeftRadius), px(cs.borderTopRightRadius), px(cs.borderBottomRightRadius), px(cs.borderBottomLeftRadius)],
        op: parseFloat(cs.opacity),
        shadow: cs.boxShadow === 'none' ? null : cs.boxShadow,
        ff: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
        fs: px(cs.fontSize), fw: cs.fontWeight, lh: px(cs.lineHeight),
        ls: cs.letterSpacing === 'normal' ? 0 : px(cs.letterSpacing),
        td: cs.textDecorationLine,
      },
      authored: auth,
      tokens,
      unmatched,
    };
  }

  /**
   * A nested al-* custom element -> an INSTANCE BOUNDARY node. The host element carries
   * what the Figma instance needs: attributes pick the variant, light-DOM text fills the
   * Text property, and the host's own rect is the placement box. The inner shadow tree is
   * still walked so a component missing from Figma can fall back to a flattened build.
   */
  function boundary(child, rootBox, depth, arbitrate) {
    const innerRules = rulesOf(child.shadowRoot);
    const inner = [...child.shadowRoot.children].find((n) => n.tagName !== 'STYLE');
    const sub = inner ? tree(inner, rootBox, innerRules, depth + 1, arbitrate) : null;
    if (!sub) return null;
    sub.host = child.tagName.toLowerCase();
    const ha = {};
    for (const a of child.attributes) ha[a.name] = a.value;
    sub.hostAttrs = ha;
    const hb = child.getBoundingClientRect();
    sub.hostBox = {
      x: Math.round((hb.left - rootBox.left) * 100) / 100,
      y: Math.round((hb.top - rootBox.top) * 100) / 100,
      w: Math.round(hb.width * 100) / 100,
      h: Math.round(hb.height * 100) / 100,
    };
    const ht = (child.textContent || '').trim();
    if (ht) sub.hostText = ht;
    // Which NAMED slots the host actually fills. Figma models optional slots as BOOLEAN
    // properties (Button's 'Slot Before' / 'Slot After'), and an instance inherits the
    // default variant's value — so a button with no icon still renders the default
    // variant's icons unless we explicitly turn them off. Presence has to be measured.
    const named = [];
    for (const c of child.children) {
      const sn = c.getAttribute && c.getAttribute('slot');
      if (sn && named.indexOf(sn) === -1) named.push(sn);
    }
    sub.hostSlots = named;
    return sub;
  }

  // Depth cap. 6 is right for a COMPONENT (its own shadow tree is shallow) and far too
  // shallow for a PAGE SECTION: the Southleft hero nests
  // section > layout > layout > grid > layout > text-block, so its buttons and token
  // chips sat below the cut and vanished. __section raises it; components keep 6.
  let MAX_DEPTH = 6;
  window.__setMaxDepth = (n) => { MAX_DEPTH = Number(n) || 6; };


  /**
   * ::before / ::after that PAINT, with a derived box.
   *
   * A pseudo-element has no node, so a DOM walk cannot see it (skill trap 17) — which is
   * why `.sl-section-rule`'s numbered hairline was missing from every built frame. There
   * is no API for a pseudo's geometry either, but the common decorative case is a flex
   * child: ::before takes the space from the parent's content edge to the first real
   * child, ::after from the last real child to the content end. Derive exactly that, and
   * emit nothing when the shape is not a horizontal flex row we can reason about.
   */
  function pseudoBoxes(el, cs) {
    const out = [];
    for (const which of ['::before', '::after']) {
      let p;
      try { p = getComputedStyle(el, which); } catch (e) { continue; }
      if (!p || p.content === 'none' || p.display === 'none') continue;
      const bg = p.backgroundColor;
      const paints = (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent')
        || (p.backgroundImage && p.backgroundImage !== 'none');
      if (!paints) continue;
      if (cs.display !== 'flex' && cs.display !== 'inline-flex') continue;
      if ((cs.flexDirection || 'row').indexOf('row') !== 0) continue;

      const pr = el.getBoundingClientRect();
      const padL = parseFloat(cs.paddingLeft) || 0, padR = parseFloat(cs.paddingRight) || 0;
      const contentL = pr.left + padL, contentR = pr.right - padR;
      const gap = parseFloat(cs.columnGap) || 0;
      const rects = [...el.children]
        .map((c) => c.getBoundingClientRect())
        .filter((r) => r.width > 0 || r.height > 0)
        .sort((a, b) => a.left - b.left);
      if (!rects.length) continue;

      const thick = parseFloat(p.blockSize || p.height) || 1;
      const x = which === '::before' ? contentL : rects[rects.length - 1].right + gap;
      const right = which === '::before' ? rects[0].left - gap : contentR;
      const w = right - x;
      if (!(w > 0.5)) continue;
      // RELATIVE TO THE OWNING ELEMENT. Everything else in the tree is stored relative
      // to the section root, so emitting viewport coordinates here made the builder
      // subtract a relative value from an absolute one — the rules landed at y=1411
      // inside a 190px frame and were clipped out of sight.
      out.push({
        which,
        x: x - pr.left, y: (pr.height - thick) / 2,
        w, h: thick,
        bg, bgImage: p.backgroundImage !== 'none' ? p.backgroundImage : null,
      });
    }
    return out.length ? out : undefined;
  }

  function tree(el, rootBox, rules, depth, arbitrate) {
    if (depth > MAX_DEPTH) return null;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return null;
    const node = describe(el, rootBox, rules, arbitrate);
    node.kids = [];
    node.pseudo = pseudoBoxes(el, cs);
    // A <canvas> is PAINTED BY JS and has no CSS to read — the hero's sparse glyph field
    // (+ o > -) is one, so a CSS-only walk sees an empty box. Export its pixels instead.
    if (el.tagName === 'CANVAS') {
      try { node.canvasPng = el.toDataURL('image/png'); } catch (e) { /* tainted */ }
    }
    // <img>/<svg> are REPLACED elements: no CSS paints them, so a style-only walk sees an
    // empty box (the logo wall is nothing but images). Drawing them to a canvas here is
    // unreliable — an SVG <img> may report naturalWidth 0, and it would also miss the CSS
    // `filter` the logo wall depends on (brightness(0) invert(1) is what makes the marks
    // white). Tag them instead and let the DRIVER screenshot the real painted element.
    if (el.tagName === 'IMG' || el.tagName === 'SVG' || el.tagName === 'svg'
      // A childless element painted ONLY by background-image (the hero's
      // grid-texture lattice is CSS gradients on an empty div) — no token
      // and no child will ever express it; screenshot the painted element
      // like the other replaced elements (hero round 4). Children present →
      // skip: rasterising a container would bake its text into pixels.
      || (el.children.length === 0 && cs.backgroundImage && cs.backgroundImage !== 'none')) {
      const id = 'r' + (window.__rasterSeq = (window.__rasterSeq || 0) + 1);
      try { el.setAttribute('data-fig-raster', id); node.rasterId = id; } catch (e) { /* ignore */ }
    }
    // A wrapped INLINE element's getBoundingClientRect is the union of its line boxes,
    // so its x/y describe no box that exists. In a preformatted block every child is
    // such an element; take the whole run as one text node instead.
    if (/^pre/.test(cs.whiteSpace)) {
      const t = (el.textContent || '').replace(/\s+$/, '');
      if (t) {
        // Flattening to one text node fixed the overlap but threw away the syntax
        // colouring (green ticks, red prompt, blue agent). Keep the RUNS -- offset,
        // length and colour -- so the builder can restore them as text ranges.
        const runs = [];
        let off = 0;
        (function walkRuns(parent, inherited) {
          for (const cn of parent.childNodes) {
            if (cn.nodeType === 3) {
              const len = cn.textContent.length;
              if (len) runs.push({ start: off, end: off + len, color: inherited });
              off += len;
            } else if (cn.nodeType === 1) {
              walkRuns(cn, getComputedStyle(cn).color);
            }
          }
        })(el, cs.color);
        node.text = t;
        node.pre = true;
        node.runs = runs.filter((r) => r.start < t.length).map((r) => ({ ...r, end: Math.min(r.end, t.length) }));
        return node;
      }
    }
    // A HOST at the walk ROOT (a web-component section like al-footer): its
    // rendered content is the SHADOW tree — the SLOT branch below re-expands
    // slotted light content at its slot position. Walking el.children took
    // the light DOM only, so every shadow-TEMPLATED node (the footer's
    // quote, divider, copyright — attribute-driven template output) vanished
    // (footer round 2). Nested hosts never reach here: the boundary() branch
    // intercepts them before recursion.
    for (const child of (el.shadowRoot ? el.shadowRoot.children : el.children)) {
      if (child.tagName === 'STYLE' || child.tagName === 'SCRIPT') continue;
      if (child.tagName === 'SLOT') {
        for (const a of child.assignedNodes({ flatten: true })) {
          if (a.nodeType === 3) {
            const t = a.textContent.trim();
            if (t) {
              // Typography comes from the slot's parent (trap 6 — that is what slotted
              // text actually inherits from), but the BOX must be the text's own extent.
              // Borrowing the parent's box made a chip's label start at the chip's left
              // edge and run underneath the dot beside it. A Range gives the real one.
              const n = describe(child.parentElement || el, rootBox, rules, arbitrate);
              n.text = t; n.kids = []; n.slotted = true;
              try {
                const rg = document.createRange();
                rg.selectNodeContents(a);
                const rb = rg.getBoundingClientRect();
                if (rb.width > 0.5 && rb.height > 0.5) {
                  n.x = +(rb.left - rootBox.left).toFixed(2);
                  n.y = +(rb.top - rootBox.top).toFixed(2);
                  n.w = +rb.width.toFixed(2);
                  n.h = +rb.height.toFixed(2);
                }
              } catch (e) { /* keep the parent box */ }
              node.kids.push(n);
            }
          } else if (a.nodeType === 1) {
            // A slotted al-* component is an instance boundary, exactly like one the
            // molecule renders itself — this is how most molecules compose.
            const sub = a.shadowRoot
              ? boundary(a, rootBox, depth, arbitrate)
              : tree(a, rootBox, rules, depth + 1, arbitrate);
            if (sub) { sub.slotted = true; node.kids.push(sub); }
          }
        }
        continue;
      }
      if (child.shadowRoot) {
        const sub = boundary(child, rootBox, depth, arbitrate);
        if (sub) node.kids.push(sub);
        continue;
      }
      const sub = tree(child, rootBox, rules, depth + 1, arbitrate);
      if (sub) node.kids.push(sub);
    }
    if (!node.kids.length) {
      const t = (el.textContent || '').trim();
      if (t) node.text = t;
    } else {
      // MIXED CONTENT. `.sl-token-chip` is `<span class="__dot"></span>--sl-color-red-500: ...`
      // -- an element child followed by a bare text node. Keying text off "has no kids"
      // dropped that label and the chip rendered as an empty box with a dot in it.
      let own = '';
      for (const cn of el.childNodes) if (cn.nodeType === 3) own += cn.textContent;
      own = own.trim();
      if (own) node.ownText = own;
    }
    return node;
  }

  window.__debug = { expand, classifyBorder, parts, box, unwrapVar, tokenOf, spec, authored, rulesOf };

  /**
   * Rules visible to LIGHT DOM. `rulesOf` reads adoptedStyleSheets, which is right for a
   * component's shadow root and empty for the document. A real page section is light DOM
   * styled by linked stylesheets, so its rules come from document.styleSheets.
   */
  function docRules() {
    const out = [];
    let order = 0;
    const visit = (rule) => {
      if (rule.cssRules && !rule.selectorText) {
        if (rule.media && !window.matchMedia(rule.media.mediaText).matches) return;
        for (const r of rule.cssRules) visit(r);
        return;
      }
      if (!rule.selectorText) return;
      out.push({ sel: rule.selectorText, style: rule.style, order: order++ });
    };
    for (const sheet of document.styleSheets) {
      let top;
      try { top = sheet.cssRules; } catch (e) { continue; }   // cross-origin
      for (const r of top) visit(r);
    }
    for (const sheet of document.adoptedStyleSheets || []) {
      let top;
      try { top = sheet.cssRules; } catch (e) { continue; }
      for (const r of top) visit(r);
    }
    return out;
  }

  /**
   * Measure a REAL PAGE SECTION, not a synthetic harness case.
   *
   * `__spec` walks `section[data-atom] .case` and requires a shadow root on each host —
   * it only ever sees isolated components rendered from plan.mjs. That is how a Figma
   * "Hero" got built from a component nobody puts on the page: the pipeline could not
   * look at the page at all. This walks any selector on a live route instead, so the
   * measured thing is what a visitor actually sees, with real copy.
   */
  window.__section = function (selector, maxDepth) {
    const out = [];
    const prev = MAX_DEPTH;
    MAX_DEPTH = Number(maxDepth) || 14;
    const rules = docRules();
    for (const el of document.querySelectorAll(selector)) {
      const rb = el.getBoundingClientRect();
      if (rb.width < 1 || rb.height < 1) continue;
      out.push({
        selector,
        id: el.dataset.sectionId || el.id || el.className || selector,
        box: { x: rb.x, y: rb.y, w: rb.width, h: rb.height },
        root: tree(el, rb, rules, 0, true),
      });
    }
    MAX_DEPTH = prev;
    return out;
  };

  window.__spec = function (state) {
    state = state || 'default';
    const pseudos = STATE_PSEUDO[state];
    if (!pseudos) throw new Error('unknown state ' + state);

    // Add the marker class so pseudo-rewritten selectors can match. We never inject
    // styles — matching is all we need, the values come from the authored rules.
    if (pseudos.length) {
      for (const host of hosts()) {
        host.classList.add(FORCE);
        for (const sr of shadowRoots(host)) for (const el of sr.querySelectorAll('*')) el.classList.add(FORCE);
      }
    }

    const rewrite = (rules) =>
      rules.map((r) => {
        let sel = r.sel;
        for (const p of pseudos) sel = sel.split(p).join('.' + FORCE);
        return { ...r, sel };
      });

    const out = [];
    for (const section of document.querySelectorAll('section[data-atom]')) {
      for (const wrap of section.querySelectorAll('.case')) {
        const host = wrap.firstElementChild;
        if (!host || !host.shadowRoot) continue;
        const rootEl = [...host.shadowRoot.children].find((n) => n.tagName !== 'STYLE');
        if (!rootEl) continue;
        const rules = rewrite(rulesOf(host.shadowRoot));
        const rb = rootEl.getBoundingClientRect();
        out.push({ tag: section.dataset.atom, case: wrap.dataset.case, state, root: tree(rootEl, rb, rules, 0, pseudos.length === 0) });
      }
    }

    if (pseudos.length) {
      for (const host of hosts()) {
        host.classList.remove(FORCE);
        for (const sr of shadowRoots(host)) for (const el of sr.querySelectorAll('*')) el.classList.remove(FORCE);
      }
    }
    return out;
  };
})();
