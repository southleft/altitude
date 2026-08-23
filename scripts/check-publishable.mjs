#!/usr/bin/env node
/**
 * check-publishable.mjs — assert every publishable package really is publishable.
 *
 * WHY THIS REPLACES `npm publish --dry-run`:
 * the old CI job ran `npm publish --dry-run` in each library and treated exit 0
 * as proof the package was releasable. But npm short-circuits on
 * `"private": true` — it prints a notice and exits 0 WITHOUT packing, resolving
 * files, or validating anything. Both libraries are private, so the job passed
 * unconditionally and could not fail no matter how broken the packages got. A
 * green check that cannot go red is worse than no check: it reads as evidence.
 *
 * This gate asserts the publish contract directly, so every rule below is one
 * that can actually fail.
 *
 * Asserts, for each library:
 *   R1  package.json parses and declares a name + version
 *   R2  `private` is not true — the package can leave the machine
 *   R3  a `files` allowlist exists and is non-empty (otherwise npm ships the
 *       whole working directory, node_modules exclusions notwithstanding)
 *   R4  every path in `files` resolves to something on disk after a build
 *   R5  `main` / `module` / `types` / every `exports` target resolves on disk —
 *       the class of break that only surfaces as a consumer's import error
 *   R6  `npm pack --dry-run --json` succeeds and reports a non-empty tarball
 *   R7  the packed file list actually contains the R5 entry points
 *
 * Requires the libraries to be built first (`pnpm run build`), since R4-R7 read
 * emitted artifacts. Usage: node scripts/check-publishable.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Every workspace that is meant to leave the machine. All four moved to the
 * `@southleft/*` scope; these are DIRECTORY paths, not package names, so they
 * are unaffected by the rename. `altitude-mcp` and `sl-web-components` joined
 * this list when they stopped being `"private": true` — a package that can
 * publish and is not checked here is exactly the hole this gate replaced.
 */
const LIBS = [
  'libs/al-web-components',
  'libs/al-react',
  'libs/altitude-mcp',
  'libs/sl-web-components',
];

const failures = [];
const fail = (lib, rule, msg) => failures.push(`${lib} ${rule}: ${msg}`);

/** Collect every string leaf of an `exports` map (conditions nest arbitrarily). */
function exportTargets(node, out = []) {
  if (typeof node === 'string') {
    out.push(node);
  } else if (node && typeof node === 'object') {
    for (const value of Object.values(node)) exportTargets(value, out);
  }
  return out;
}

for (const lib of LIBS) {
  const libDir = join(REPO_ROOT, lib);
  const manifestPath = join(libDir, 'package.json');

  // R1 — parses, named, versioned.
  if (!existsSync(manifestPath)) {
    fail(lib, 'R1', `no package.json at ${manifestPath}`);
    continue;
  }
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (err) {
    fail(lib, 'R1', `package.json does not parse: ${err.message}`);
    continue;
  }
  if (!pkg.name) fail(lib, 'R1', 'package.json has no "name"');
  if (!pkg.version) fail(lib, 'R1', 'package.json has no "version"');

  // R2 — the whole point. `private: true` makes `npm publish` a no-op.
  if (pkg.private === true) {
    fail(
      lib,
      'R2',
      '"private": true — npm publish exits 0 without publishing. Remove it (or ' +
        'set it false) to actually release this package.',
    );
  }

  // R3 — an explicit allowlist.
  if (!Array.isArray(pkg.files) || pkg.files.length === 0) {
    fail(lib, 'R3', 'no non-empty "files" allowlist; npm would ship the working directory');
  }

  // R4 — allowlist entries exist. Bare globs are checked by their literal prefix.
  for (const entry of pkg.files ?? []) {
    const literal = String(entry).replace(/[*?[].*$/, '');
    const probe = join(libDir, literal);
    if (literal && !existsSync(probe)) {
      fail(lib, 'R4', `"files" entry "${entry}" does not exist (looked for ${literal})`);
    }
  }

  // R5 — entry points resolve. This is what consumers actually hit.
  const entryPoints = new Set(
    [pkg.main, pkg.module, pkg.types, ...exportTargets(pkg.exports)].filter(
      (t) => typeof t === 'string' && t.startsWith('.'),
    ),
  );
  for (const target of entryPoints) {
    if (target.includes('*')) continue; // wildcard subpaths — R7 covers the packed list
    if (!existsSync(join(libDir, target))) {
      fail(lib, 'R5', `entry point "${target}" does not exist on disk (build first?)`);
    }
  }

  // R6/R7 — pack for real. Unlike `publish --dry-run`, `pack` ignores `private`
  // and genuinely resolves the file list, so it fails when the package is broken.
  let packed;
  try {
    const raw = execFileSync('npm', ['pack', '--dry-run', '--json'], {
      cwd: libDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });
    packed = JSON.parse(raw)[0];
  } catch (err) {
    fail(lib, 'R6', `npm pack --dry-run failed: ${err.message}`);
    continue;
  }
  if (!packed || !packed.files || packed.files.length === 0) {
    fail(lib, 'R6', 'npm pack produced an empty tarball');
    continue;
  }

  const packedPaths = new Set(packed.files.map((f) => f.path.replace(/\\/g, '/')));
  for (const target of entryPoints) {
    if (target.includes('*')) continue;
    // Skip anything R5 already reported as missing — it cannot be in the
    // tarball either, and one root cause should produce one failure.
    if (!existsSync(join(libDir, target))) continue;
    const rel = target.replace(/^\.\//, '');
    if (!packedPaths.has(rel)) {
      fail(lib, 'R7', `entry point "${target}" exists on disk but the "files" allowlist excludes it from the tarball`);
    }
  }

  console.log(
    `${lib}: ${pkg.name}@${pkg.version} — ${packed.files.length} files, ` +
      `${(packed.unpackedSize / 1024).toFixed(0)}KB unpacked`,
  );
}

if (failures.length > 0) {
  console.error(`\ncheck-publishable: ${failures.length} failure(s)\n`);
  for (const f of failures) console.error(`  ${f}`);
  console.error(
    '\nThis gate replaced `npm publish --dry-run`, which exited 0 on private\n' +
      'packages and so could never fail. These are real publish blockers.\n',
  );
  process.exit(1);
}

console.log(`\ncheck-publishable: all ${LIBS.length} packages are publishable.`);
