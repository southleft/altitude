#!/usr/bin/env node
/**
 * check-doc-anchors.mjs — documentation-rot gate.
 *
 * WHY IT EXISTS:
 * documentation in this repo instructs agents as much as humans, so a stale doc
 * is not cosmetic — it is a wrong instruction that a headless session will
 * follow. A 2026-09-02 audit found four classes of rot, every one of them
 * mechanically detectable:
 *
 *   - 14 docs walking the reader through a Storybook retired 8 days earlier
 *   - a skill invoking scripts/contracts/rebuild-sheet-from-set.mjs, deleted
 *   - .altitude/WORKFLOWS.md naming two scripts that do not exist
 *   - CLAUDE.md documenting a `build:storybook` script no package.json defines
 *
 * So this gate reads every doc's CODE SPANS and fenced blocks — the places a doc
 * makes a checkable claim about the repo — and resolves each claim against disk:
 *
 *   PATH     `scripts/foo.mjs`, `.altitude/PARITY.md`  → the file must exist
 *   SCRIPT   `pnpm run build:all`                      → root package.json
 *   FILTER   `pnpm --filter al-app-astro start`        → workspace + its scripts
 *   FLAG     `node scripts/foo.mjs --sheet`            → --sheet in that source
 *
 * WHAT IT DELIBERATELY DOES NOT DO — the false-positive budget:
 * a gate that fails on prose gets switched off within a week (see the same
 * argument in scripts/check-audit.mjs). Every heuristic here fails OPEN: an
 * ambiguous span is skipped and counted, never reported. The skip reasons are
 * enumerated in SKIP_REASONS and printed under --json, so "why didn't it catch
 * X" is answerable without reading the code. The load-bearing conservatism is
 * ANCHORING: a path is only checked when its first segment is a real top-level
 * directory of this repo (or a dotfile directory like .github/). `foo/bar.mjs`
 * where `foo` is not a top-level dir is indistinguishable from a path inside a
 * consumer's app, so it is skipped rather than guessed at.
 *
 * Existence is checked CASE-SENSITIVELY by reading directory entries, because
 * this repo is developed on Windows and shipped through Linux CI: `Readme.md`
 * resolves locally and reds the build in Actions.
 *
 * Accepted exceptions go in .altitude/doc-anchors-allowlist.json with a reason
 * and an optional expiry, following check-audit.mjs: an entry past its expiry
 * FAILS the gate on purpose, so an exception is a dated decision rather than a
 * permanent hole.
 *
 * Usage: node scripts/check-doc-anchors.mjs            (pnpm run check:doc-anchors)
 *        [paths...]        scan these files/dirs instead of the default doc set
 *        --root <dir>      treat <dir> as the repo root (used by the self-test)
 *        --allowlist <f>   override the allowlist path
 *        --unanchored      also check bare filenames (`argv.mjs`) via a repo-wide
 *                          basename index. OFF by default: high false-positive risk.
 *        --json            machine-readable report on stdout
 *        --quiet           suppress the PASS/skip chatter; failures still print
 *
 * Zero dependencies, offline, no network, no build.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------- argv

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const JSON_OUT = flag('--json');
const QUIET = flag('--quiet');
const UNANCHORED = flag('--unanchored');

const SELF_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(opt('--root', resolve(SELF_DIR, '..')));
const ALLOWLIST_PATH = resolve(
  opt('--allowlist', join(REPO_ROOT, '.altitude', 'doc-anchors-allowlist.json')),
);

// Positional args (anything not a flag and not a flag's value) override the doc set.
const CONSUMED = new Set(['--root', '--allowlist']);
const positional = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('-')) {
    if (CONSUMED.has(argv[i])) i++;
    continue;
  }
  positional.push(argv[i]);
}

// ---------------------------------------------------------------- doc set

/** Directories never scanned. `history/` is archived docs — they are ALLOWED to
 *  describe a dead world, that is what an archive is for. */
const EXCLUDED_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  'worktrees',
  '.mm',
  'history',
  'coverage',
  'build',
  '.next',
  '.cache',
  'storybook-static',
]);
const EXCLUDED_FILES = new Set(['CHANGELOG.md']);

function walkMarkdown(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (EXCLUDED_DIRS.has(e.name)) continue;
      walkMarkdown(join(dir, e.name), out);
    } else if (e.isFile() && e.name.endsWith('.md') && !EXCLUDED_FILES.has(e.name)) {
      out.push(join(dir, e.name));
    }
  }
  return out;
}

function defaultDocSet() {
  const files = [];
  // *.md at the repo root (non-recursive)
  for (const e of readdirSync(REPO_ROOT, { withFileTypes: true })) {
    if (e.isFile() && e.name.endsWith('.md') && !EXCLUDED_FILES.has(e.name)) {
      files.push(join(REPO_ROOT, e.name));
    }
  }
  walkMarkdown(join(REPO_ROOT, '.altitude'), files);
  walkMarkdown(join(REPO_ROOT, '.claude', 'skills'), files);
  for (const group of ['apps', 'libs']) {
    const base = join(REPO_ROOT, group);
    if (!existsSync(base)) continue;
    for (const e of readdirSync(base, { withFileTypes: true })) {
      if (!e.isDirectory() || EXCLUDED_DIRS.has(e.name)) continue;
      const readme = join(base, e.name, 'README.md');
      if (existsSync(readme)) files.push(readme);
    }
  }
  return [...new Set(files)].sort();
}

function resolveDocSet() {
  if (positional.length === 0) return defaultDocSet();
  const files = [];
  for (const p of positional) {
    const abs = resolve(REPO_ROOT, p);
    if (!existsSync(abs)) continue;
    if (statSync(abs).isDirectory()) walkMarkdown(abs, files);
    else files.push(abs);
  }
  return [...new Set(files)].sort();
}

// ------------------------------------------------- case-sensitive existence

/** readdir cache: dir -> Set of entry names. Keeps the whole run to a few
 *  hundred readdir calls even across ~170 docs. */
const dirCache = new Map();
function entriesOf(dir) {
  let names = dirCache.get(dir);
  if (names === undefined) {
    try {
      names = new Set(readdirSync(dir));
    } catch {
      names = null;
    }
    dirCache.set(dir, names);
  }
  return names;
}

/**
 * Exists, honouring case even on a case-insensitive filesystem — this repo is
 * authored on Windows and gated on Linux CI, so `Readme.md` must fail HERE.
 * Returns 'file' | 'dir' | null.
 */
function existsExact(absPath) {
  const rel = relative(REPO_ROOT, absPath);
  if (rel.startsWith('..')) return null; // outside the repo: not our business
  let cur = REPO_ROOT;
  const segments = rel.split(sep).filter(Boolean);
  if (segments.length === 0) return 'dir';
  for (let i = 0; i < segments.length; i++) {
    const names = entriesOf(cur);
    if (!names || !names.has(segments[i])) return null;
    cur = join(cur, segments[i]);
  }
  try {
    return statSync(cur).isDirectory() ? 'dir' : 'file';
  } catch {
    return null;
  }
}

/** Top-level directory names, used for the anchoring rule. */
const TOP_LEVEL_DIRS = new Set(
  readdirSync(REPO_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name),
);

/** Lazy basename index, only built under --unanchored. */
let basenameIndex = null;
function basenameExists(name) {
  if (!basenameIndex) {
    basenameIndex = new Set();
    const walk = (dir, depth) => {
      if (depth > 8) return;
      let entries;
      try {
        entries = readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        if (e.isDirectory()) {
          if (EXCLUDED_DIRS.has(e.name)) continue;
          walk(join(dir, e.name), depth + 1);
        } else basenameIndex.add(e.name);
      }
    };
    walk(REPO_ROOT, 0);
  }
  return basenameIndex.has(name);
}

// ---------------------------------------------------------------- manifests

function readJson(p) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

const rootPkg = readJson(join(REPO_ROOT, 'package.json')) ?? {};
/** `//`-prefixed keys are section comments in this repo's package.json, not scripts. */
const ROOT_SCRIPTS = new Set(
  Object.keys(rootPkg.scripts ?? {}).filter((k) => !k.startsWith('//')),
);

/**
 * Workspace map: every name a `--filter` could legitimately use → its scripts.
 * pnpm-workspace.yaml is parsed with a five-line reader rather than a yaml
 * dependency; the file is a single `packages:` list of quoted globs.
 */
function loadWorkspaces() {
  const map = new Map();
  const wsPath = join(REPO_ROOT, 'pnpm-workspace.yaml');
  if (!existsSync(wsPath)) return map;
  const globs = [];
  let inPackages = false;
  for (const raw of readFileSync(wsPath, 'utf8').split(/\r?\n/)) {
    if (/^packages:\s*$/.test(raw)) {
      inPackages = true;
      continue;
    }
    if (inPackages) {
      const m = raw.match(/^\s*-\s*['"]?([^'"#]+?)['"]?\s*$/);
      if (m) globs.push(m[1]);
      else if (raw.trim() && !raw.startsWith(' ')) inPackages = false;
    }
  }
  for (const glob of globs) {
    // Only `dir/*` and plain `dir` are used here; anything fancier is ignored
    // rather than half-supported.
    const parts = glob.split('/');
    const dirs = [];
    if (parts.length === 2 && parts[1] === '*') {
      const base = join(REPO_ROOT, parts[0]);
      if (existsSync(base)) {
        for (const e of readdirSync(base, { withFileTypes: true })) {
          if (e.isDirectory()) dirs.push(join(base, e.name));
        }
      }
    } else if (!glob.includes('*')) {
      dirs.push(join(REPO_ROOT, glob));
    }
    for (const d of dirs) {
      const pkg = readJson(join(d, 'package.json'));
      if (!pkg) continue;
      const scripts = new Set(Object.keys(pkg.scripts ?? {}).filter((k) => !k.startsWith('//')));
      const rel = relative(REPO_ROOT, d).split(sep).join('/');
      const record = { name: pkg.name, dir: rel, scripts };
      if (pkg.name) map.set(pkg.name, record);
      map.set(rel, record); // `--filter ./apps/astro` / `apps/astro`
      map.set(`./${rel}`, record);
    }
  }
  return map;
}
const WORKSPACES = loadWorkspaces();

/**
 * A script's own source PLUS the sources it imports relatively, one level deep.
 * Flags are frequently parsed by a shared helper (scripts/lib/argv.mjs), so
 * looking only at the entry file would flag live flags as retired — a false
 * positive of exactly the kind this gate must not produce.
 */
const sourceCache = new Map();
function scriptSourceWithLocalImports(absPath) {
  let text = sourceCache.get(absPath);
  if (text !== undefined) return text;
  let src = '';
  try {
    src = readFileSync(absPath, 'utf8');
  } catch {
    sourceCache.set(absPath, '');
    return '';
  }
  const parts = [src];
  const importRe = /from\s+['"](\.[^'"]+)['"]|import\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g;
  let m;
  const seen = new Set();
  while ((m = importRe.exec(src))) {
    const spec = m[1] ?? m[2];
    if (!spec || seen.has(spec)) continue;
    seen.add(spec);
    const target = resolve(dirname(absPath), spec);
    try {
      parts.push(readFileSync(target, 'utf8'));
    } catch {
      /* unresolvable import: not this gate's problem */
    }
  }
  text = parts.join('\n');
  sourceCache.set(absPath, text);
  return text;
}

// ---------------------------------------------------------------- extraction

const KNOWN_EXTENSIONS = new Set([
  '.mjs', '.cjs', '.js', '.ts', '.tsx', '.jsx', '.json',
  '.scss', '.css', '.yml', '.yaml', '.md', '.html',
]);

/** Every reason a candidate is dropped without being checked. Printed under --json. */
const SKIP_REASONS = {
  placeholder: 'contains a placeholder segment (<x>, ALL_CAPS, ..., {a,b})',
  glob: 'contains a glob character',
  url: 'looks like a URL or a package spec',
  unanchored: 'first segment is not a top-level directory of this repo',
  relative: 'relative to an unknown base (../)',
  bare: 'bare filename with no directory (enable --unanchored to check these)',
  notAPath: 'no known extension and no path separator',
  builtin: 'a package-manager builtin command, not a script',
  workspaceGlob: 'filter selector is a pattern or dependency selector',
  recursive: 'recursive run (-r): no single script to resolve',
  environment: 'lives in an environment-dependent tree (.mm/, node_modules/)',
};

const skips = Object.fromEntries(Object.keys(SKIP_REASONS).map((k) => [k, 0]));
const skip = (reason) => {
  skips[reason]++;
  return null;
};

const PLACEHOLDER_RE = /^[A-Z][A-Z0-9_]*$/; // WORKSPACE_NAME, COMPONENT
const hasPlaceholder = (t) =>
  t.includes('<') ||
  t.includes('>') ||
  t.includes('...') ||
  t.includes('…') || // … — an elided path in prose
  t.includes('{') ||
  t.includes('[') ||
  t.includes(']') ||
  t.includes('$') ||
  PLACEHOLDER_RE.test(t);

/**
 * Environment-dependent trees. A doc may correctly name a path here, but the
 * path's existence says nothing about the doc: `.mm/` is gitignored local
 * project state (absent in CI entirely) and node_modules/ depends on an install.
 * Checking either would make the gate's verdict depend on the machine.
 */
const SKIP_PREFIXES = ['.mm', 'node_modules', '.git'];

/** Strip the noise a code span picks up from prose. */
function cleanToken(tok) {
  let t = tok.trim();
  t = t.replace(/^[`'"(\[]+/, '').replace(/[`'"),;\]]+$/, '');
  return t;
}

/**
 * Turn a token into a checkable repo-relative path, or null (counted as a skip).
 * Handles a trailing `:123` line cite and a `#anchor`.
 */
function toPathCandidate(tok) {
  let t = cleanToken(tok);
  if (!t) return null;
  if (t.startsWith('-')) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t) || t.startsWith('//')) return skip('url');
  if (t.startsWith('@')) return skip('url'); // npm scope, e.g. @southleft/al-react
  if (/[*?|!%\\]/.test(t)) return skip('glob');
  if (hasPlaceholder(t)) return skip('placeholder');
  if (t.startsWith('/')) return skip('url'); // route or absolute path, e.g. GET /parity.json
  if (t.startsWith('../')) return skip('relative');
  if (t === '.' || t === '..') return null;
  if (t.startsWith('./')) t = t.slice(2);

  t = t.split('#')[0];
  // Line cites this repo writes: `file.ts:73`, `file.ts:73:4`, `file.ts:88-104`,
  // `file.mjs:43,63`. Missing the ranged forms made every cited file read as
  // missing — the single largest source of false positives in the first run.
  t = t.replace(/:\d+(?:[-,:]\d+)*$/, '');
  // A sentence-final period glued to the path: `...payload.json.`
  t = t.replace(/\.+$/, '');
  if (!t) return null;
  const trailingSlash = t.endsWith('/');
  if (trailingSlash) t = t.slice(0, -1);
  if (!t) return null;
  if (SKIP_PREFIXES.some((p) => t === p || t.startsWith(`${p}/`))) return skip('environment');
  // A version-ish or sentence-ish token: `1.2.3`, `e.g`, `al-button.contract`
  const dot = t.lastIndexOf('.');
  const ext = dot > 0 ? t.slice(dot).toLowerCase() : '';
  const hasSlash = t.includes('/');
  const knownExt = KNOWN_EXTENSIONS.has(ext);
  if (!hasSlash && !knownExt) return skip('notAPath');
  if (!hasSlash) return UNANCHORED ? { path: t, bare: true } : skip('bare');

  const first = t.split('/')[0];
  const anchored = TOP_LEVEL_DIRS.has(first) || (first.startsWith('.') && first.length > 1);
  if (!anchored) return skip('unanchored');
  // `apps/docs` with no extension is a directory reference — fine. But a
  // multi-segment token with no extension AND no trailing slash that is clearly
  // prose (contains a space) never reaches here: tokens are whitespace-split.
  return { path: t, bare: false };
}

const PM_BUILTINS = new Set([
  'install', 'i', 'add', 'remove', 'rm', 'uninstall', 'up', 'update', 'upgrade',
  'audit', 'dlx', 'exec', 'why', 'ls', 'list', 'outdated', 'publish', 'pack',
  'link', 'unlink', 'store', 'config', 'init', 'create', 'import', 'prune',
  'rebuild', 'root', 'bin', 'licenses', 'server', 'setup', 'env', 'patch',
  'patch-commit', 'deploy', 'fetch', 'version', 'dedupe', 'approve-builds',
  // npm lifecycle names that resolve without a scripts entry
  'test', 'start', 'restart', 'stop',
]);

/** npm lifecycle names: builtin at the top level, real scripts under --filter. */
const LIFECYCLE = new Set(['test', 'start', 'restart', 'stop']);

/** Flags that swallow the next token, so it is not mistaken for a script name. */
const VALUE_FLAGS = new Set(['--filter', '-F', '--dir', '-C', '--workspace', '-w', '--reporter']);

/**
 * Parse one command line's tokens into anchors. Returns an array of
 * { kind, anchor, ...detail }. Unparseable shapes yield nothing — silently
 * skipping a command is safe, mis-parsing one is not.
 */
function parseCommand(tokens, startIdx) {
  const bin = tokens[startIdx];
  const rest = tokens.slice(startIdx + 1).map(cleanToken).filter(Boolean);
  const out = [];

  if (bin === 'node') {
    let i = 0;
    while (i < rest.length && rest[i].startsWith('-')) i++; // node's own flags
    const scriptTok = rest[i];
    if (!scriptTok) return out;
    const cand = toPathCandidate(scriptTok);
    if (!cand) return out;
    const ext = cand.path.slice(cand.path.lastIndexOf('.')).toLowerCase();
    if (!['.mjs', '.js', '.cjs', '.ts'].includes(ext)) return out;
    const flags = [];
    for (const t of rest.slice(i + 1)) {
      if (!t.startsWith('--') || t === '--') continue;
      const name = t.split('=')[0];
      if (hasPlaceholder(name) || name.length < 4) continue;
      flags.push(name);
    }
    out.push({ kind: 'node', anchor: `node ${cand.path}`, path: cand.path, flags });
    return out;
  }

  // pnpm / npm / yarn
  let filterTarget = null;
  let recursive = false;
  let sawRun = false;
  let script = null;
  for (let i = 0; i < rest.length; i++) {
    const t = rest[i];
    if (t === '--') continue;
    if (t === '--filter' || t === '-F') {
      filterTarget = rest[++i] ?? null;
      continue;
    }
    if (t.startsWith('--filter=')) {
      filterTarget = t.slice('--filter='.length);
      continue;
    }
    if (t === '-r' || t === '--recursive') {
      recursive = true;
      continue;
    }
    if (t.startsWith('-')) {
      if (VALUE_FLAGS.has(t)) i++;
      continue;
    }
    if (!sawRun && (t === 'run' || t === 'run-script')) {
      sawRun = true;
      continue;
    }
    script = t;
    break;
  }

  if (!script) return out;
  if (hasPlaceholder(script) || script.includes('*')) {
    skip('placeholder');
    return out;
  }
  // `pnpm test` is npm's lifecycle passthrough and resolves with or without a
  // scripts entry — but `pnpm --filter al-app-react start` is a genuine claim
  // that al-app-react HAS a `start` script, which is exactly what CLAUDE.md's
  // dev-command table asserts. So lifecycle names stay checkable under --filter.
  const isLifecycle = LIFECYCLE.has(script);
  if (!sawRun && PM_BUILTINS.has(script) && !(filterTarget && isLifecycle)) {
    skip('builtin');
    return out;
  }

  if (filterTarget) {
    const target = cleanToken(filterTarget);
    // `--filter "./apps/*"`, `--filter ...al-react`, `--filter WORKSPACE_NAME`:
    // a pattern, a dependency selector or a placeholder names no single package.
    if (!target || target.includes('*') || target.includes('^') || hasPlaceholder(target)) {
      skip('workspaceGlob');
      return out;
    }
    out.push({
      kind: 'filter',
      anchor: `${bin} --filter ${target} ${script}`,
      workspace: target,
      script,
    });
    return out;
  }
  if (recursive) {
    skip('recursive');
    return out;
  }
  out.push({ kind: 'script', anchor: `${bin} ${sawRun ? 'run ' : ''}${script}`, script });
  return out;
}

const COMMAND_BINS = new Set(['pnpm', 'npm', 'yarn', 'node']);

/**
 * Pull every anchor out of one chunk of code text (an inline span, or one line
 * of a fenced block). Chunks are whitespace-tokenised, so prose never survives.
 */
function anchorsInChunk(chunk) {
  const found = [];
  // A chunk that elides part of itself is an illustration, not a claim about
  // this repo — e.g. apps/docs/README.md's hypothetical "acme" project config,
  // whose paths are correctly fictional. One line, one decision, easy to read.
  if (/…|(?:^|\s)\.\.\.(?:\s|$|[,}\])])/.test(chunk)) {
    skip('placeholder');
    return found;
  }
  // Split on shell separators so `cd x && pnpm run y` yields both commands.
  for (const piece of chunk.split(/&&|\|\||;|\|/)) {
    const tokens = piece.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    const commandConsumed = new Set();
    for (let i = 0; i < tokens.length; i++) {
      const bare = cleanToken(tokens[i]);
      if (COMMAND_BINS.has(bare)) {
        for (const a of parseCommand(tokens, i)) found.push(a);
        for (let j = i; j < tokens.length; j++) commandConsumed.add(j);
        break;
      }
    }
    for (let i = 0; i < tokens.length; i++) {
      if (commandConsumed.has(i)) continue;
      const cand = toPathCandidate(tokens[i]);
      if (cand) found.push({ kind: 'path', anchor: cand.path, path: cand.path, bare: cand.bare });
    }
  }
  return found;
}

/** Walk a markdown file, yielding { line, chunk } for code spans and fenced lines. */
function chunksOf(text) {
  const out = [];
  const lines = text.split(/\r?\n/);
  let fence = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      if (fence && line.trim().startsWith(fence)) {
        fence = null;
        continue;
      }
      if (!fence) {
        fence = fenceMatch[1];
        continue;
      }
    }
    if (fence) {
      out.push({ line: i + 1, chunk: line });
      continue;
    }
    const spanRe = /(`+)([^`]+)\1/g;
    let m;
    while ((m = spanRe.exec(line))) out.push({ line: i + 1, chunk: m[2] });
  }
  return out;
}

// ---------------------------------------------------------------- resolution

function resolveAnchor(a, docAbs) {
  const docDir = dirname(docAbs);

  if (a.kind === 'path' || a.kind === 'node') {
    const p = a.path;
    if (a.bare) {
      // --unanchored only: a bare filename passes if it exists anywhere.
      if (!basenameExists(p)) return `no file named ${p} anywhere in the repo`;
    } else {
      let hit = existsExact(join(REPO_ROOT, p));
      // Extensionless module reference (`scripts/check-register-altitude`),
      // resolved the way node would. The doc is imprecise, not wrong.
      if (!hit && !p.includes('.', p.lastIndexOf('/') + 1)) {
        for (const ext of ['.mjs', '.js', '.cjs', '.ts', '.tsx']) {
          if (existsExact(join(REPO_ROOT, p + ext))) {
            hit = 'file';
            break;
          }
        }
      }
      if (!hit) {
        // Second chance: relative to the doc's own directory. Skill docs
        // legitimately say `SKILL.md` / `references/foo.md` about themselves.
        const near = existsExact(join(docDir, p));
        if (!near) {
          const insensitive = existsSync(join(REPO_ROOT, p)) || existsSync(join(docDir, p));
          return insensitive
            ? `path exists but the case does not match — fails on Linux CI`
            : `no such file or directory`;
        }
        return null;
      }
    }
    if (a.kind === 'node' && a.flags?.length) {
      const abs = join(REPO_ROOT, a.path);
      const src = scriptSourceWithLocalImports(abs);
      const dead = a.flags.filter((f) => !src.includes(f));
      if (dead.length) {
        return `${dead.join(', ')} not found in ${a.path} (or its local imports) — retired flag?`;
      }
    }
    return null;
  }

  if (a.kind === 'script') {
    if (ROOT_SCRIPTS.has(a.script)) return null;
    return `no "${a.script}" script in the root package.json`;
  }

  if (a.kind === 'filter') {
    const ws = WORKSPACES.get(a.workspace);
    if (!ws) return `no workspace named "${a.workspace}" under pnpm-workspace.yaml's globs`;
    if (!ws.scripts.has(a.script)) {
      return `workspace ${ws.name} (${ws.dir}) has no "${a.script}" script`;
    }
    return null;
  }
  return null;
}

// ---------------------------------------------------------------- allowlist

function loadAllowlist() {
  if (!existsSync(ALLOWLIST_PATH)) return { entries: [], expired: [], errors: [] };
  let raw;
  try {
    raw = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));
  } catch (err) {
    return { entries: [], expired: [], errors: [`${ALLOWLIST_PATH} does not parse: ${err.message}`] };
  }
  const today = new Date().toISOString().slice(0, 10);
  const entries = [];
  const expired = [];
  const errors = [];
  for (const e of raw.allowed ?? []) {
    if (!e || (!e.anchor && !e.pattern) || !e.reason) {
      errors.push(`allowlist entry ${JSON.stringify(e)} needs an "anchor" or "pattern", plus a "reason"`);
      continue;
    }
    if (e.expires && !/^\d{4}-\d{2}-\d{2}$/.test(e.expires)) {
      errors.push(`allowlist entry ${e.anchor ?? e.pattern} has a malformed "expires" (want YYYY-MM-DD)`);
      continue;
    }
    if (e.expires && e.expires < today) {
      expired.push(e);
      continue;
    }
    let re = null;
    if (e.pattern) {
      try {
        re = new RegExp(e.pattern);
      } catch (err) {
        errors.push(`allowlist pattern ${e.pattern} is not a valid regex: ${err.message}`);
        continue;
      }
    }
    entries.push({ ...e, re, used: 0 });
  }
  return { entries, expired, errors };
}

const allowlist = loadAllowlist();

function allowedBy(failure) {
  for (const e of allowlist.entries) {
    if (e.files && !failure.file.includes(e.files)) continue;
    if (e.anchor && e.anchor === failure.anchor) {
      e.used++;
      return e;
    }
    if (e.re && e.re.test(failure.anchor)) {
      e.used++;
      return e;
    }
  }
  return null;
}

// ---------------------------------------------------------------- run

const docs = resolveDocSet();
const failures = [];
const allowed = [];
let extracted = 0;
let resolved = 0;

for (const doc of docs) {
  const relDoc = relative(REPO_ROOT, doc).split(sep).join('/');
  let text;
  try {
    text = readFileSync(doc, 'utf8');
  } catch {
    continue;
  }
  const seen = new Set();
  for (const { line, chunk } of chunksOf(text)) {
    for (const a of anchorsInChunk(chunk)) {
      const key = `${line}::${a.kind}::${a.anchor}`;
      if (seen.has(key)) continue;
      seen.add(key);
      extracted++;
      const why = resolveAnchor(a, doc);
      if (!why) {
        resolved++;
        continue;
      }
      const failure = { file: relDoc, line, kind: a.kind, anchor: a.anchor, why };
      const allow = allowedBy(failure);
      if (allow) allowed.push({ ...failure, reason: allow.reason, expires: allow.expires ?? null });
      else failures.push(failure);
    }
  }
}

const staleAllowlist = allowlist.entries.filter((e) => e.used === 0);

// ---------------------------------------------------------------- report

const report = {
  root: REPO_ROOT,
  docs: docs.length,
  extracted,
  resolved,
  failed: failures.length,
  allowed: allowed.length,
  skipped: skips,
  failures,
  allowedFailures: allowed,
  expiredAllowlist: allowlist.expired,
  staleAllowlist: staleAllowlist.map((e) => e.anchor ?? e.pattern),
  allowlistErrors: allowlist.errors,
};

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2));
} else if (!QUIET) {
  console.log('check-doc-anchors: documentation anchors resolved against the repo\n');
  console.log(`  docs scanned : ${docs.length}`);
  console.log(`  anchors      : ${extracted} extracted, ${resolved} resolved, ${failures.length} failed, ${allowed.length} allowlisted`);
  const skipTotal = Object.values(skips).reduce((a, b) => a + b, 0);
  console.log(`  skipped      : ${skipTotal} ambiguous span(s) — ${JSON.stringify(skips)}\n`);
}

const byKind = { path: [], script: [], filter: [], node: [] };
for (const f of failures) (byKind[f.kind] ??= []).push(f);

if (failures.length && !JSON_OUT) {
  const LABEL = {
    path: 'MISSING PATHS',
    script: 'MISSING ROOT SCRIPTS',
    filter: 'MISSING WORKSPACE SCRIPTS',
    node: 'BROKEN node INVOCATIONS',
  };
  for (const kind of ['path', 'script', 'filter', 'node']) {
    const rows = byKind[kind] ?? [];
    if (!rows.length) continue;
    console.error(`${LABEL[kind]} (${rows.length})`);
    for (const f of rows) console.error(`  ${f.file}:${f.line}  ${f.anchor}  →  ${f.why}`);
    console.error('');
  }
}

if (!JSON_OUT && !QUIET) {
  if (allowed.length) {
    console.log(`ALLOWLISTED (${allowed.length}) — dated exceptions, still broken on disk`);
    for (const a of allowed) {
      console.log(`  ${a.file}:${a.line}  ${a.anchor}  (${a.reason}${a.expires ? `, expires ${a.expires}` : ''})`);
    }
    console.log('');
  }
  if (staleAllowlist.length) {
    console.log(`STALE ALLOWLIST (${staleAllowlist.length}) — these matched nothing; delete them`);
    // Print the ENTRY, not the object. This said "[object Object]" until
    // 2026-09-03, which made a CI failure unactionable: the gate knew exactly
    // which exception had gone stale and would not say.
    for (const s of staleAllowlist) {
      console.log(`  ${s.anchor ?? s.pattern}${s.files ? `  (files: ${s.files})` : ''}`);
      if (s.reason) console.log(`      reason on file: ${s.reason.slice(0, 120)}`);
    }
    console.log('');
  }
}

// ---------------------------------------------------------------- verdict

const blocking = [];
for (const e of allowlist.errors) blocking.push(e);
for (const e of allowlist.expired) {
  blocking.push(
    `allowlist entry ${e.anchor ?? e.pattern} expired on ${e.expires} — re-assess or re-date it`,
  );
}

if (failures.length || blocking.length) {
  if (blocking.length) {
    console.error(`check-doc-anchors: ${blocking.length} allowlist problem(s)`);
    for (const b of blocking) console.error(`  ${b}`);
    console.error('');
  }
  console.error(
    `check-doc-anchors: FAIL — ${failures.length} unresolved anchor(s) in ${docs.length} doc(s).\n` +
      `Fix the doc (or the code it describes), or record a dated exception in\n` +
      `.altitude/doc-anchors-allowlist.json:\n` +
      `  { "anchor": "<exact anchor>" | "pattern": "<regex>", "reason": "...", "expires": "YYYY-MM-DD" }\n`,
  );
  process.exit(1);
}

if (!QUIET && !JSON_OUT) {
  console.log('check-doc-anchors: PASS — every checkable anchor resolves.');
}
process.exit(0);
