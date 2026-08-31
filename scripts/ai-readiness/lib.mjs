// Shared helpers for the AI-readiness harness.
//
// Cross-machine binary discovery: every wrapper around the host shells
// (Superconductor, Claude Code installer scripts, etc.) needs to be
// transparent. We auto-skip any wrapper whose source starts with a hook
// shebang the host imports — pick the first non-wrapper match on disk.
//
// Cross-platform: PATH is delimiter-split with `path.delimiter` (`;` on
// Windows, `:` elsewhere) rather than a hardcoded `:` — the old code
// silently returned zero candidates on Windows, where `PATH` is one long
// `;`-joined string. On Windows a bare `name` (e.g. `claude`) is almost
// never directly executable — the real file on disk carries one of
// `PATHEXT`'s extensions (`.EXE`, `.CMD`, `.BAT`, ...) or, for npm-installed
// CLIs, no extension at all (a Node shebang script). We probe both: the
// bare name first (covers extensionless shims, which `isWrapper` can also
// inspect), then bare-name + each `PATHEXT` extension.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, delimiter } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';

// The ONE tmp directory every harness script agrees on. `os.tmpdir()` is
// used deliberately instead of the literal `/tmp` — on Windows, Node
// resolves a bare `/tmp` path drive-relative (e.g. `D:\tmp`), which is a
// DIFFERENT directory from the OS temp dir Git Bash maps `/tmp` to
// (`%LOCALAPPDATA%\Temp`). Importing this single constant everywhere keeps
// the probe, the judge, and both digest builders writing to (and reading
// from) the same place.
export const TMPDIR = tmpdir();

const KNOWN_WRAPPER_DIRS = ['superconductor', 'claude-installer', 'nvm-shim'];
const IS_WIN = process.platform === 'win32';
// PATHEXT is Windows-only; on POSIX this stays empty and candidateNames()
// below degenerates to just the bare name.
const PATHEXT = IS_WIN
  ? (process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD').split(delimiter).filter(Boolean)
  : [];
const COMMON_PATHS = [
  '/opt/homebrew/bin',
  '/usr/local/bin',
  '/usr/bin',
  `${process.env.HOME || ''}/.local/bin`,
  `${process.env.HOME || ''}/.cargo/bin`,
  `${process.env.HOME || ''}/.npm-global/bin`,
];

function isWrapper(filePath) {
  try {
    if (!existsSync(filePath)) return false;
    const head = readFileSync(filePath, 'utf8').slice(0, 1024);
    return /superconductor|agent-wrapper/i.test(head);
  } catch {
    return false;
  }
}

// Bare name first (extensionless shims — also what `isWrapper` can read as
// text), then, on Windows, every `PATHEXT` extension. `existsSync` is
// case-insensitive on Windows's default filesystems so casing doesn't
// matter here.
function candidateNames(name) {
  if (!IS_WIN) return [name];
  return [name, ...PATHEXT.map((ext) => name + ext)];
}

export function findBinary(name, envVar) {
  if (envVar && process.env[envVar]) {
    const p = process.env[envVar];
    if (existsSync(p)) return p;
    console.error(`${envVar}=${p} not found; falling back to PATH search`);
  }
  const names = candidateNames(name);
  const candidates = [];
  for (const p of (process.env.PATH || '').split(delimiter)) {
    if (!p) continue;
    if (KNOWN_WRAPPER_DIRS.some(d => p.includes(d))) continue;
    for (const n of names) candidates.push(join(p, n));
  }
  for (const p of COMMON_PATHS) {
    if (!p) continue;
    for (const n of names) candidates.push(join(p, n));
  }
  for (const c of candidates) {
    if (!existsSync(c)) continue;
    try {
      const s = statSync(c);
      if (!s.isFile()) continue;
    } catch { continue; }
    if (isWrapper(c)) continue;
    return c;
  }
  return null;
}

// Run a child process to completion and return { exitCode, stdout, stderr }.
// Stdout is captured; logFile (if given) gets a tee so long sessions are
// inspectable in real time.
export function runChild(bin, args, opts = {}) {
  return new Promise((resolve) => {
    // Node's spawn() cannot exec a `.cmd`/`.bat` directly on Windows without
    // `shell: true` (that's how many npm-installed CLIs — e.g. a global
    // `codex` — get shimmed). Real `.exe` binaries (the `claude` CLI) don't
    // need it and are safer without it (no shell-quoting surprises for long
    // JSON-schema / prompt arguments), so only opt in when the resolved
    // binary actually is a shell shim.
    const needsShell = IS_WIN && /\.(cmd|bat)$/i.test(bin);
    const child = spawn(bin, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: opts.timeoutMs || 10 * 60 * 1000,
      env: { ...process.env, ...(opts.env || {}) },
      shell: needsShell,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => resolve({ exitCode: code, stdout, stderr }));
    child.on('error', (err) => resolve({ exitCode: -1, stdout, stderr: String(err) }));
  });
}

// Extract a JSON object from a freeform model response. Models sometimes wrap
// JSON in markdown fences or prose. Look for the outermost { ... } block.
export function extractJson(text) {
  if (!text) return null;
  let s = text.trim();
  // Strip ```json fences if present
  const fence = s.match(/```(?:json)?\s*([\s\S]+?)```/);
  if (fence) s = fence[1].trim();
  // Find first { and last }
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first === -1 || last === -1 || last < first) return null;
  const candidate = s.slice(first, last + 1);
  try { return JSON.parse(candidate); } catch { return null; }
}

export function nowStamp() {
  // Filename-safe ISO without separators
  return new Date().toISOString().replace(/[:.]/g, '-');
}

// Resolve a package that pnpm did not hoist to the repo root — it is a
// transitive dependency of some workspace (playwright/axe-core/esbuild are
// all transitive deps of @southleft/al-web-components's axe-playwright /
// vite), so a script under scripts/ cannot `import`/`require` it by bare
// specifier. Mirrors the resolver scripts/build-a11y-report.mjs already
// uses for the same reason — centralized here so lib/axe-check.mjs can
// share it instead of re-deriving the pnpm-store-walk logic a third time.
// Throws with an actionable message (run `pnpm install` at the repo root)
// rather than a bare ERR_MODULE_NOT_FOUND.
export function resolvePkg(pkg, subpath, rootDir) {
  const req = createRequire(import.meta.url);
  try {
    return req.resolve(subpath ? `${pkg}/${subpath}` : pkg);
  } catch {
    /* not hoisted — look in the pnpm store below */
  }
  const store = join(rootDir, 'node_modules', '.pnpm');
  if (existsSync(store)) {
    const prefix = `${pkg.replace(/\//g, '+')}@`;
    let best = null;
    for (const dir of readdirSync(store)) {
      if (!dir.startsWith(prefix)) continue;
      const root = join(store, dir, 'node_modules', pkg);
      if (!existsSync(root)) continue;
      const file = subpath ? join(root, subpath) : root;
      if (subpath && !existsSync(file)) continue;
      best = file; // keep scanning; last match wins (newest-ish directory listing)
    }
    if (best) return best;
  }
  throw new Error(
    `Cannot resolve "${pkg}${subpath ? `/${subpath}` : ''}". It is a transitive dependency of ` +
      '@southleft/al-web-components; run `pnpm install` at the repo root first.',
  );
}
