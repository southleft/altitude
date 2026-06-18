// Shared helpers for the AI-readiness harness.
//
// Cross-machine binary discovery: every wrapper around the host shells
// (Superconductor, Claude Code installer scripts, etc.) needs to be
// transparent. We auto-skip any wrapper whose source starts with a hook
// shebang the host imports — pick the first non-wrapper match on disk.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const KNOWN_WRAPPER_DIRS = ['superconductor', 'claude-installer', 'nvm-shim'];
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

export function findBinary(name, envVar) {
  if (envVar && process.env[envVar]) {
    const p = process.env[envVar];
    if (existsSync(p)) return p;
    console.error(`${envVar}=${p} not found; falling back to PATH search`);
  }
  const candidates = [];
  for (const p of (process.env.PATH || '').split(':')) {
    if (!p) continue;
    if (KNOWN_WRAPPER_DIRS.some(d => p.includes(d))) continue;
    candidates.push(join(p, name));
  }
  for (const p of COMMON_PATHS) {
    if (!p) continue;
    candidates.push(join(p, name));
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
    const child = spawn(bin, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: opts.timeoutMs || 10 * 60 * 1000,
      env: { ...process.env, ...(opts.env || {}) },
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
