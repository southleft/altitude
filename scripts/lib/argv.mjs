/**
 * argv.mjs — the one copy of the tiny CLI flag helpers every parity/contract
 * script used to carry privately.
 *
 * Before 2026-08-27 the `argOf()` body below existed byte-identical in five
 * scripts (emit-contracts, extract-canvas, diff-contracts, generate-figma,
 * build-component-docs) while two more hand-rolled weaker parses that missed
 * the `--flag=value` spelling (spec 2026-08-27-parity-system-audit-remediation,
 * R4). One definition, imported everywhere, so the two spellings can never
 * diverge per script again.
 *
 * NOTE: `--project` has its own dedicated parser — `projectFromArgv()` in
 * libs/altitude-mcp/src/lib/ds-project.mjs — because project resolution also
 * involves DS_PROJECT and the registry default. Use that (usually indirectly
 * via `resolveProject()`), not `argOf('--project')`.
 */

/**
 * Value of `--flag <value>` or `--flag=<value>`, else null.
 * A following token that starts with `-` is treated as the next flag, not a value.
 */
export function argOf(flag, argv = process.argv) {
  const eq = argv.find((a) => typeof a === 'string' && a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1) || null;
  const i = argv.indexOf(flag);
  return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('-') ? argv[i + 1] : null;
}

/** Is the bare flag present (either spelling)? */
export function hasFlag(flag, argv = process.argv) {
  return argv.some((a) => a === flag || (typeof a === 'string' && a.startsWith(`${flag}=`)));
}

/**
 * Positional (non-flag) arguments, skipping the VALUES of the named flags.
 *
 * `positionals(process.argv, { valueFlags: ['--project'] })` on
 * `node x.mjs al-button --project southleft` returns `['al-button']` — the old
 * `filter((a) => !a.startsWith('--'))` idiom kept `southleft` as a positional,
 * which is exactly the check-parity.mjs bug this module exists to prevent.
 */
export function positionals(argv = process.argv, { valueFlags = [] } = {}) {
  const args = argv.slice(2);
  const out = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (typeof a !== 'string') continue;
    if (a.startsWith('-')) {
      const name = a.includes('=') ? a.slice(0, a.indexOf('=')) : a;
      if (!a.includes('=') && valueFlags.includes(name) && args[i + 1] && !args[i + 1].startsWith('-')) i += 1;
      continue;
    }
    out.push(a);
  }
  return out;
}
