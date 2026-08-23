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
        display: cs.display, dir: cs.flexDirection, align: cs.alignItems, justify: cs.justifyContent,
        pos: cs.position, vis: cs.visibility, opacityRaw: cs.opacity,
        gap: cs.columnGap === 'normal' ? 0 : px(cs.columnGap),
        pad: [px(cs.paddingTop), px(cs.paddingRight), px(cs.paddingBottom), px(cs.paddingLeft)],
        bg: cs.backgroundColor, fc: cs.color,
        bw: px(cs.borderTopWidth), bc: cs.borderTopColor, bstyle: cs.borderTopStyle,
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

  function tree(el, rootBox, rules, depth, arbitrate) {
    if (depth > 6) return null;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return null;
    const node = describe(el, rootBox, rules, arbitrate);
    node.kids = [];
    for (const child of el.children) {
      if (child.tagName === 'STYLE' || child.tagName === 'SCRIPT') continue;
      if (child.tagName === 'SLOT') {
        for (const a of child.assignedNodes({ flatten: true })) {
          if (a.nodeType === 3) {
            const t = a.textContent.trim();
            if (t) { const n = describe(child.parentElement || el, rootBox, rules, arbitrate); n.text = t; n.kids = []; n.slotted = true; node.kids.push(n); }
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
    }
    return node;
  }

  window.__debug = { expand, classifyBorder, parts, box, unwrapVar, tokenOf, spec, authored, rulesOf };

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
