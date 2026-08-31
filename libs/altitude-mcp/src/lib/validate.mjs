// Wraps libs/al-web-components/cli/validate.mjs — shells out to the real CLI
// rather than reimplementing it, so the MCP tool can never drift from the
// validator's own logic or its stable error codes
// (ERR_UNKNOWN_COMPONENT / ERR_UNKNOWN_ATTRIBUTE / ERR_INVALID_ENUM / ERR_TYPE_MISMATCH).

import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PATHS, HINTS, requireFile } from './paths.mjs';

function looksLikeExistingPath(input) {
  if (input.includes('<') || input.includes('\n')) return false; // markup, not a path
  try {
    return existsSync(input) && (statSync(input).isFile() || statSync(input).isDirectory());
  } catch {
    return false;
  }
}

function runCli(target) {
  return new Promise((resolve, reject) => {
    requireFile(PATHS.validateCli, HINTS.cem);
    const child = spawn(process.execPath, [PATHS.validateCli, '--json', target], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', reject);
    child.on('close', () => {
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        reject(new Error(`altitude-validate did not emit valid JSON. stderr: ${stderr.slice(0, 500)}`));
      }
    });
  });
}

/**
 * @param {{markup?: string, path?: string}} input Exactly one of markup or path.
 * @returns the validate.mjs JSON envelope, verbatim.
 */
export async function validate({ markup, path } = {}) {
  if (path) {
    return runCli(path);
  }
  if (markup == null) throw new Error('altitude_validate requires either `markup` or `path`.');
  if (looksLikeExistingPath(markup)) {
    return runCli(markup);
  }
  // Inline markup — write to a scratch file so the CLI (a file/dir scanner) can read it.
  const dir = mkdtempSync(join(tmpdir(), 'altitude-mcp-validate-'));
  const file = join(dir, 'usage.html');
  writeFileSync(file, markup, 'utf8');
  try {
    return await runCli(file);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
