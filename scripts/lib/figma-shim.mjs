/**
 * figma-shim.mjs — the one copy of the figma-console shim transport.
 *
 * Every live-Figma script talks to `scripts/figma-atoms/mcp-shim.mjs` (HTTP on
 * :9401 by default). Before 2026-08-27 the `call()`/`parsePayload()` pair below
 * existed verbatim in refresh-figma-digests / extract-canvas / generate-figma
 * and was re-implemented inline eight more times across scripts/figma-atoms/,
 * three of those with the port hardcoded (spec
 * 2026-08-27-parity-system-audit-remediation, R4).
 *
 * Flag convention: `--port <n>` (canonical) with `--shim <n>` kept as an alias
 * because generate-figma.mjs shipped with it. `shimPortFromArgv()` reads both.
 */
import { argOf } from './argv.mjs';

export const DEFAULT_SHIM_PORT = 9401;

/** Resolve the shim port from `--port` (canonical) or `--shim` (legacy alias). */
export function shimPortFromArgv(argv = process.argv) {
  const raw = argOf('--port', argv) ?? argOf('--shim', argv);
  const n = Number(raw);
  return raw != null && Number.isFinite(n) ? n : DEFAULT_SHIM_PORT;
}

/** Thrown when the shim itself cannot be reached (vs. a tool-level failure). */
export class ShimUnreachableError extends Error {
  constructor(port, fileName = null) {
    super(
      `Cannot reach the figma-console shim on :${port}.\n` +
        'Start it first:  node scripts/figma-atoms/mcp-shim.mjs\n' +
        (fileName
          ? `(Figma Desktop must be open on "${fileName}" with the Desktop Bridge plugin running.)`
          : '(Figma Desktop must be open with the Desktop Bridge plugin running.)'),
    );
    this.code = 'ERR_SHIM_UNREACHABLE';
    this.port = port;
  }
}

/**
 * POST one MCP tool call to the shim; returns the raw `text` payload.
 * Throws ShimUnreachableError when the shim is down, or Error on a tool error.
 * `fileName` only flavors the unreachable message — pass the project's Figma
 * file name when you have it.
 */
export async function call(name, args, { port = DEFAULT_SHIM_PORT, fileName = null } = {}) {
  let res;
  try {
    res = await fetch(`http://127.0.0.1:${port}/call`, {
      method: 'POST',
      body: JSON.stringify({ name, arguments: args }),
    });
  } catch {
    throw new ShimUnreachableError(port, fileName);
  }
  const body = await res.json();
  if (body.error || body.isError) {
    throw new Error(`${name} failed: ${JSON.stringify(body.error ?? body.text).slice(0, 500)}`);
  }
  return body.text;
}

/**
 * Decoy-file guard: does the live session's status text mention one of the
 * project's declared decoy file keys (`figma.decoys[]` in ds-projects.json)?
 * Moved here from extract-canvas.mjs (2026-08-27) so generate-figma.mjs can
 * import it WITHOUT importing extract-canvas's CLI module (which runs
 * `await main()` at top level); extract-canvas re-exports this one.
 * refresh-figma-digests.mjs's inline loop is the same rule.
 *
 * @returns {{blocked: boolean, decoy: object|null}}
 */
export function checkDecoyGuard(project, statusText) {
  for (const decoy of project.figma?.decoys ?? []) {
    if (statusText.includes(decoy.fileKey)) return { blocked: true, decoy };
  }
  return { blocked: false, decoy: null };
}

/** figma_execute wraps output unpredictably — dig the JSON payload out. */
export function parsePayload(text) {
  try {
    const outer = JSON.parse(text);
    // Common shapes: the value itself, or { result: <json-string> }.
    if (typeof outer === 'string') return JSON.parse(outer);
    if (outer && typeof outer.result === 'string') return JSON.parse(outer.result);
    return outer?.result ?? outer;
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end <= start) throw new Error(`unparseable figma_execute payload: ${text.slice(0, 300)}`);
    return JSON.parse(text.slice(start, end + 1));
  }
}
