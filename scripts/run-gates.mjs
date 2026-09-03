#!/usr/bin/env node
/**
 * run-gates.mjs — one command that runs this repo's gates, and one that keeps
 * the gate inventory honest against CI.
 *
 * WHY IT EXISTS. The repo has ~115 runnable root scripts. CI invokes 35 of them
 * by name and pulls more in transitively; the rest exist only as local commands
 * that someone has to remember. The only umbrella that ever existed was a
 * hand-typed command block in AGENTS.md, and it had already gone stale (it still
 * lists `build:storybook`, retired 2026-08-25). A list of commands maintained by
 * hand rots exactly the way a hand-written doc rots.
 *
 * So the inventory lives in `.altitude/gates.json` — declarative, one entry per
 * gate — and this file is the only thing that reads it. Two modes:
 *
 *   RUN MODE     select gates by tier/group/id, probe each one's declared
 *                prerequisites, run what can run, and NAME every skip.
 *   --check-ci   cross-check the manifest against the workflow in both
 *                directions and exit non-zero on disagreement.
 *
 * THE ONE RULE THIS FILE IS BUILT AROUND: a gate that did not run must never
 * look like a gate that passed. Every skip is printed with its unmet
 * prerequisite, skipped is counted separately from passed, and the summary line
 * says so. Silence is the only forbidden failure.
 *
 * --check-ci follows the discipline check-mcp-docs.mjs states for generated
 * artifacts: "a generated artifact is gated by re-running its generator, not by
 * a second, independently-drifting parser." gates.json is NOT generated — its
 * `purpose` and `needs` are human judgement — but its `ci` field is a pure fact
 * about .github/workflows/v2-checks.yml, so that half IS re-derived from the
 * workflow and diffed, rather than trusted.
 *
 * Zero npm dependencies. Node built-ins only.
 *
 * Usage:
 *   node scripts/run-gates.mjs                       # --tier fast
 *   node scripts/run-gates.mjs --tier build
 *   node scripts/run-gates.mjs --group contracts
 *   node scripts/run-gates.mjs --only lint,check:llms
 *   node scripts/run-gates.mjs --tier fast --skip gate:self-test --bail
 *   node scripts/run-gates.mjs --list [--json]
 *   node scripts/run-gates.mjs --check-ci [--json]
 *
 * Exit codes:
 *   0  every selected blocking gate passed (skips and non-blocking failures do
 *      not change this — they are reported, loudly)
 *   1  a blocking gate failed, or --check-ci found drift
 *   2  usage error
 *   3  the manifest is missing, unparseable, or structurally invalid
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createConnection } from 'node:net';
import { lookup } from 'node:dns';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const MANIFEST = join(ROOT, '.altitude', 'gates.json');

const TIERS = ['fast', 'build', 'live'];
const REQUIRED_FIELDS = ['id', 'command', 'purpose', 'needs', 'blocking', 'ci', 'tier'];

// ── argv ────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const opts = {
    tier: null,
    group: null,
    only: null,
    skip: [],
    list: false,
    json: false,
    bail: false,
    checkCi: false,
    root: ROOT,
    manifest: null,
    workflow: null,
    timeoutMs: 15 * 60 * 1000,
  };
  const listArg = (v) =>
    String(v ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) usage(`${a} needs a value`);
      return v;
    };
    switch (a) {
      case '--tier': opts.tier = next(); break;
      case '--group': opts.group = next(); break;
      case '--only': opts.only = (opts.only ?? []).concat(listArg(next())); break;
      case '--skip': opts.skip = opts.skip.concat(listArg(next())); break;
      case '--list': opts.list = true; break;
      case '--json': opts.json = true; break;
      case '--bail': opts.bail = true; break;
      case '--check-ci': opts.checkCi = true; break;
      case '--timeout': opts.timeoutMs = Number(next()); break;
      // --root/--manifest/--workflow exist for the self-test, which points the
      // runner at throwaway fixture repos. Asserting against the real repo would
      // make the tests fail whenever someone legitimately adds a gate.
      case '--root': opts.root = resolve(next()); break;
      case '--manifest': opts.manifest = resolve(next()); break;
      case '--workflow': opts.workflow = resolve(next()); break;
      case '-h':
      case '--help': usage(null); break;
      default:
        if (a.startsWith('-')) usage(`unknown flag ${a}`);
        usage(`unexpected positional argument "${a}"`);
    }
  }
  if (opts.tier && opts.tier !== 'all' && !TIERS.includes(opts.tier)) {
    usage(`--tier must be one of ${TIERS.join(' | ')} | all (got "${opts.tier}")`);
  }
  if (!opts.manifest) opts.manifest = join(opts.root, '.altitude', 'gates.json');
  if (!opts.workflow) opts.workflow = join(opts.root, '.github', 'workflows', 'v2-checks.yml');
  return opts;
}

function usage(problem) {
  const text = `
run-gates.mjs — run the gates declared in .altitude/gates.json

  --tier fast|build|live|all   which tier to run (default: fast)
  --group <name>               run one family only (contracts, docs, tokens, ...)
  --only <id,id>               run exactly these gate ids (ignores tier/group,
                               and runs gates marked autorun:false)
  --skip <id,id>               exclude these gate ids
  --bail                       stop at the first blocking failure
  --list                       print the inventory and exit
  --json                       machine-readable output
  --check-ci                   cross-check the manifest against
                               ${'.github/workflows/v2-checks.yml'} in both directions
  --timeout <ms>               per-gate timeout (default 900000)

Manifest: ${MANIFEST}
`.trim();
  if (problem) {
    console.error(`run-gates: ${problem}\n`);
    console.error(text);
    process.exit(2);
  }
  console.log(text);
  process.exit(0);
}

// ── manifest ────────────────────────────────────────────────────────────────

/**
 * Load and STRUCTURALLY validate. A malformed manifest exits 3 rather than
 * silently running a subset — "it ran three gates" and "it ran three of
 * eighty-five gates" must not look alike.
 */
function loadManifest(path) {
  if (!existsSync(path)) {
    console.error(`run-gates: no manifest at ${path}`);
    process.exit(3);
  }
  let data;
  try {
    data = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(`run-gates: ${path} is not valid JSON — ${err.message}`);
    process.exit(3);
  }
  const problems = validateManifest(data);
  if (problems.length) {
    console.error(`run-gates: ${path} is structurally invalid:`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(3);
  }
  return data;
}

export function validateManifest(data) {
  const problems = [];
  if (!data || typeof data !== 'object') return ['manifest is not an object'];
  if (!Array.isArray(data.gates)) return ['manifest has no `gates` array'];
  const vocab = new Set(Object.keys(data.needsVocabulary ?? {}));
  if (vocab.size === 0) problems.push('manifest has no `needsVocabulary`');
  const seen = new Set();
  for (const [i, g] of data.gates.entries()) {
    const where = `gates[${i}]${g?.id ? ` (${g.id})` : ''}`;
    for (const f of REQUIRED_FIELDS) {
      if (!(f in (g ?? {}))) problems.push(`${where}: missing required field \`${f}\``);
    }
    if (!g?.id) continue;
    if (seen.has(g.id)) problems.push(`${where}: duplicate id`);
    seen.add(g.id);
    if (typeof g.command !== 'string' || !g.command.trim()) problems.push(`${where}: \`command\` must be a non-empty string`);
    if (typeof g.purpose !== 'string' || !g.purpose.trim()) problems.push(`${where}: \`purpose\` must be a non-empty string`);
    if (typeof g.blocking !== 'boolean') problems.push(`${where}: \`blocking\` must be a boolean`);
    if (!TIERS.includes(g.tier)) problems.push(`${where}: \`tier\` must be one of ${TIERS.join('|')} (got ${JSON.stringify(g.tier)})`);
    if (!Array.isArray(g.needs) || g.needs.length === 0) {
      problems.push(`${where}: \`needs\` must be a non-empty array (use ["none"])`);
    } else {
      for (const n of g.needs) {
        if (!vocab.has(n)) problems.push(`${where}: need "${n}" is not in needsVocabulary — the vocabulary is closed`);
      }
    }
    const ci = g.ci;
    const ciOk = ci === null || typeof ci === 'string' || (Array.isArray(ci) && ci.every((s) => typeof s === 'string'));
    if (!ciOk) problems.push(`${where}: \`ci\` must be null, a string, or an array of strings`);
  }
  return problems;
}

const ciList = (ci) => (ci === null || ci === undefined ? [] : Array.isArray(ci) ? ci : [ci]);

// ── prerequisite probes ─────────────────────────────────────────────────────

/**
 * One probe per `needs` token. Each returns { ok, detail } — `detail` is what
 * gets printed on a skip, so it must say what was looked for, not just "no".
 * Probes are memoized and only run for tokens the SELECTION actually mentions:
 * a `--tier fast` run must not reach for the network.
 */
function makeProbes(root) {
  const has = (rel) => existsSync(join(root, rel));
  const countFiles = (rel, ext) => {
    const dir = join(root, rel);
    if (!existsSync(dir)) return 0;
    try {
      return readdirSync(dir).filter((f) => (ext ? f.endsWith(ext) : true)).length;
    } catch {
      return 0;
    }
  };
  const git = (args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' });

  return {
    none: async () => ({ ok: true, detail: 'no prerequisites' }),

    install: async () => ({
      ok: has('node_modules'),
      detail: has('node_modules') ? 'node_modules present' : 'node_modules/ absent — run `pnpm install`',
    }),

    tokens: async () => {
      const p = 'libs/al-web-components/styles/dist/tokens.json';
      return { ok: has(p), detail: has(p) ? `${p} present` : `${p} absent — run \`pnpm --filter @southleft/al-web-components build:tokens\`` };
    },

    'tokens-v5': async () => {
      const p = 'libs/al-web-components/styles/dist-v5/css';
      return { ok: has(p), detail: has(p) ? `${p}/ present` : `${p}/ absent — run \`pnpm --filter @southleft/al-web-components build:tokens\`` };
    },

    cem: async () => {
      const p = 'libs/al-web-components/custom-elements.json';
      return { ok: has(p), detail: has(p) ? `${p} present` : `${p} absent — run \`pnpm --filter @southleft/al-web-components build:custom-elements.json\`` };
    },

    libs: async () => {
      const missing = ['libs/al-web-components/dist', 'libs/al-react/dist'].filter((p) => !has(p));
      return { ok: missing.length === 0, detail: missing.length ? `${missing.join(', ')} absent — run \`pnpm run build\`` : 'both library dists present' };
    },

    fixtures: async () => {
      const missing = ['apps/web-components/dist', 'libs/al-web-components/story-fixture/dist'].filter((p) => !has(p));
      return { ok: missing.length === 0, detail: missing.length ? `${missing.join(', ')} absent — run \`pnpm run build:fixtures\`` : 'fixtures built' };
    },

    docs: async () => ({
      ok: has('dist/docs'),
      detail: has('dist/docs') ? 'dist/docs present' : 'dist/docs absent — run `pnpm --filter al-app-docs build`',
    }),

    browser: async () => {
      const roots = [
        process.env.PLAYWRIGHT_BROWSERS_PATH,
        join(homedir(), 'AppData', 'Local', 'ms-playwright'),
        join(homedir(), '.cache', 'ms-playwright'),
        join(homedir(), 'Library', 'Caches', 'ms-playwright'),
      ].filter(Boolean);
      for (const r of roots) {
        try {
          if (existsSync(r) && readdirSync(r).some((d) => d.startsWith('chromium'))) {
            return { ok: true, detail: `chromium found in ${r}` };
          }
        } catch { /* unreadable candidate, try the next */ }
      }
      return { ok: false, detail: 'no ms-playwright chromium install found — run `pnpm exec playwright install chromium`' };
    },

    'git-history': async () => {
      const head = git(['rev-parse', '--verify', 'HEAD']);
      if (head.status !== 0) return { ok: false, detail: 'no git HEAD — not a repository, or an empty one' };
      const shallow = git(['rev-parse', '--is-shallow-repository']);
      if (shallow.stdout.trim() === 'true') {
        return { ok: false, detail: 'shallow clone — these gates diff against a base ref (CI uses fetch-depth: 0)' };
      }
      return { ok: true, detail: 'full git history' };
    },

    'clean-tree': async () => {
      const st = git(['status', '--porcelain']);
      if (st.status !== 0) return { ok: false, detail: 'git status failed — not a repository?' };
      const dirty = st.stdout.split('\n').filter((l) => l.trim()).length;
      return {
        ok: dirty === 0,
        detail: dirty === 0
          ? 'working tree clean'
          : `${dirty} uncommitted change(s) — this gate diffs committed artifacts, so a dirty tree would report someone else's edits as drift`,
      };
    },

    capture: async () => {
      const p = '.altitude/figma-sync/shots/docs';
      const n = countFiles(p, '.png');
      return { ok: n > 0, detail: n > 0 ? `${n} shots in ${p}` : `${p} has no PNGs — run \`pnpm run capture:docs\`` };
    },

    canvas: async () => {
      const base = join(root, '.altitude', 'figma-sync');
      const dirs = [];
      if (existsSync(base)) {
        const walk = (dir) => {
          let entries;
          try { entries = readdirSync(dir); } catch { return; }
          for (const e of entries) {
            const abs = join(dir, e);
            let s;
            try { s = statSync(abs); } catch { continue; }
            if (!s.isDirectory()) continue;
            if (e === 'canvas-contracts') dirs.push(abs);
            else if (dir === base) walk(abs); // one level down: per-project subdirs
          }
        };
        walk(base);
      }
      const total = dirs.reduce((n, d) => n + readdirSync(d).length, 0);
      return {
        ok: total > 0,
        detail: total > 0
          ? `${total} canvas contract(s) across ${dirs.length} dir(s)`
          : 'no extracted canvas contracts (.altitude/figma-sync/**/canvas-contracts/) — they are gitignored live observations; run `pnpm run contracts:canvas` with the Figma shim up',
      };
    },

    'figma-export': async () => {
      const p = '.altitude/figma-sync/last-export.json';
      return { ok: has(p), detail: has(p) ? `${p} present` : `${p} absent — save a figma_export_tokens payload there first` };
    },

    'figma-shim': async () => {
      const ok = await tcpReachable('127.0.0.1', 9401, 700);
      return { ok, detail: ok ? 'shim answering on 127.0.0.1:9401' : 'nothing listening on 127.0.0.1:9401 — start scripts/figma-atoms/mcp-shim.mjs with Figma desktop open' };
    },

    network: async () => {
      const ok = await dnsResolves('registry.npmjs.org', 1500);
      return { ok, detail: ok ? 'registry.npmjs.org resolves' : 'registry.npmjs.org does not resolve — offline?' };
    },
  };
}

function tcpReachable(host, port, timeoutMs) {
  return new Promise((res) => {
    const sock = createConnection({ host, port });
    const done = (v) => { sock.destroy(); res(v); };
    sock.setTimeout(timeoutMs);
    sock.once('connect', () => done(true));
    sock.once('timeout', () => done(false));
    sock.once('error', () => done(false));
  });
}

function dnsResolves(host, timeoutMs) {
  return new Promise((res) => {
    let settled = false;
    const finish = (v) => { if (!settled) { settled = true; res(v); } };
    const t = setTimeout(() => finish(false), timeoutMs);
    lookup(host, (err) => { clearTimeout(t); finish(!err); });
  });
}

// ── selection ───────────────────────────────────────────────────────────────

function select(gates, opts) {
  if (opts.only?.length) {
    const byId = new Map(gates.map((g) => [g.id, g]));
    const unknown = opts.only.filter((id) => !byId.has(id));
    if (unknown.length) usage(`--only names unknown gate id(s): ${unknown.join(', ')}`);
    return opts.only.map((id) => byId.get(id)).filter((g) => !opts.skip.includes(g.id));
  }
  const tier = opts.tier ?? 'fast';
  const wanted = tier === 'all' ? TIERS : TIERS.slice(0, TIERS.indexOf(tier) + 1);
  return gates.filter((g) => {
    if (g.autorun === false) return false;
    if (opts.skip.includes(g.id)) return false;
    if (opts.group && g.group !== opts.group) return false;
    return wanted.includes(g.tier);
  });
}

// ── run mode ────────────────────────────────────────────────────────────────

const ICON = { pass: 'PASS', fail: 'FAIL', skip: 'SKIP', warn: 'WARN' };

async function run(opts, manifest) {
  const gates = select(manifest.gates, opts);
  if (gates.length === 0) {
    console.error('run-gates: selection matched no gates. Try --list.');
    process.exit(2);
  }

  const probes = makeProbes(opts.root);
  const cache = new Map();
  const probe = async (token) => {
    if (!cache.has(token)) {
      const fn = probes[token];
      cache.set(token, fn ? await fn() : { ok: false, detail: `no probe implemented for need "${token}"` });
    }
    return cache.get(token);
  };

  const tierLabel = opts.only?.length ? `--only (${gates.length})` : `tier=${opts.tier ?? 'fast'}${opts.group ? ` group=${opts.group}` : ''}`;
  if (!opts.json) {
    console.log(`run-gates: ${gates.length} gate(s) selected — ${tierLabel}`);
    console.log('');
  }

  const results = [];
  let bailed = false;

  for (const g of gates) {
    if (bailed) {
      results.push({ id: g.id, status: 'skip', blocking: g.blocking, tier: g.tier, group: g.group ?? null, reason: 'not reached — --bail stopped the run at an earlier blocking failure', ms: 0 });
      continue;
    }

    const unmet = [];
    for (const need of g.needs) {
      const r = await probe(need);
      if (!r.ok) unmet.push({ need, detail: r.detail });
    }
    if (unmet.length) {
      const reason = unmet.map((u) => `${u.need}: ${u.detail}`).join('; ');
      results.push({ id: g.id, status: 'skip', blocking: g.blocking, tier: g.tier, group: g.group ?? null, reason, ms: 0 });
      if (!opts.json) console.log(`${ICON.skip} ${g.id}\n     unmet ${reason}`);
      continue;
    }

    const started = Date.now();
    const proc = spawnSync(g.command, {
      cwd: opts.root,
      shell: true,
      encoding: 'utf8',
      timeout: g.timeoutMs ?? opts.timeoutMs,
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, CI: process.env.CI ?? '', FORCE_COLOR: '0' },
    });
    const ms = Date.now() - started;
    const output = `${proc.stdout ?? ''}${proc.stderr ?? ''}`;
    const timedOut = proc.error?.code === 'ETIMEDOUT' || proc.signal === 'SIGTERM';
    const ok = !timedOut && proc.status === 0;
    const status = ok ? 'pass' : g.blocking ? 'fail' : 'warn';

    results.push({
      id: g.id, status, blocking: g.blocking, tier: g.tier, group: g.group ?? null,
      exitCode: proc.status, ms,
      reason: ok ? null : timedOut ? `timed out after ${g.timeoutMs ?? opts.timeoutMs}ms` : `exit ${proc.status}`,
      output: ok ? null : output.slice(-8000),
    });

    if (!opts.json) {
      console.log(`${ICON[status]} ${g.id}  (${(ms / 1000).toFixed(1)}s)`);
      if (!ok) {
        console.log(`     ${g.command}`);
        console.log(`     ${timedOut ? 'timed out' : `exit ${proc.status}`}${g.blocking ? '' : ' — NON-BLOCKING (warning tier), exit code unchanged'}`);
        const tail = output.trim().split('\n').slice(-40);
        for (const line of tail) console.log(`     | ${line}`);
      }
    }

    if (!ok && g.blocking && opts.bail) bailed = true;
  }

  const passed = results.filter((r) => r.status === 'pass');
  const failed = results.filter((r) => r.status === 'fail');
  const warned = results.filter((r) => r.status === 'warn');
  const skipped = results.filter((r) => r.status === 'skip');

  if (opts.json) {
    console.log(JSON.stringify({
      selection: { tier: opts.tier ?? 'fast', group: opts.group, only: opts.only, skip: opts.skip },
      counts: { selected: results.length, passed: passed.length, failed: failed.length, warned: warned.length, skipped: skipped.length },
      results,
    }, null, 2));
  } else {
    console.log('');
    console.log(table(results));
    console.log('');
    // Skipped is its own column and its own sentence, deliberately. Folding it
    // into "passed" is the exact lie this runner exists to not tell.
    console.log(`run-gates: ${passed.length} passed, ${failed.length} failed, ${warned.length} warned (non-blocking), ${skipped.length} SKIPPED (did not run).`);
    if (skipped.length) {
      console.log('           A skipped gate proves nothing. Unmet prerequisites, by gate:');
      for (const s of skipped) console.log(`             ${s.id}: ${s.reason}`);
    }
    if (warned.length) {
      console.log('           Non-blocking failures (exit code unchanged, but they DID fail):');
      for (const w of warned) console.log(`             ${w.id}: ${w.reason}`);
    }
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

function table(results) {
  const rows = [['', 'GATE', 'TIER', 'TIME'], ...results.map((r) => [
    r.status.toUpperCase(), r.id, r.tier, r.ms ? `${(r.ms / 1000).toFixed(1)}s` : '-',
  ])];
  const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => String(r[i]).length)));
  return rows.map((r) => r.map((c, i) => String(c).padEnd(widths[i])).join('  ').trimEnd()).join('\n');
}

// ── --list ──────────────────────────────────────────────────────────────────

function list(opts, manifest) {
  const gates = manifest.gates;
  if (opts.json) {
    console.log(JSON.stringify({ counts: listCounts(gates), gates }, null, 2));
    return;
  }
  const byGroup = new Map();
  for (const g of gates) {
    const k = g.group ?? '(ungrouped)';
    if (!byGroup.has(k)) byGroup.set(k, []);
    byGroup.get(k).push(g);
  }
  for (const [group, list_] of [...byGroup].sort()) {
    console.log(`\n== ${group} (${list_.length})`);
    for (const g of list_) {
      const flags = [
        g.tier,
        g.blocking ? 'blocking' : 'warn-tier',
        ciList(g.ci).length ? `ci:${ciList(g.ci).length}` : g.ciVia ? `via:${g.ciVia}` : 'LOCAL-ONLY',
        g.autorun === false ? 'manual-only' : null,
      ].filter(Boolean).join(' ');
      console.log(`  ${g.id.padEnd(34)} [${flags}]`);
      console.log(`  ${' '.repeat(34)} needs: ${g.needs.join(', ')}`);
      console.log(`  ${' '.repeat(34)} ${g.purpose}`);
    }
  }
  const c = listCounts(gates);
  console.log(`\n${c.total} gates: ${c.inCi} run directly in CI, ${c.viaCi} run transitively, ${c.localOnly} are LOCAL ONLY.`);
  console.log(`Tiers: ${c.byTier.fast} fast, ${c.byTier.build} build, ${c.byTier.live} live. ${c.warnTier} are warning-tier. ${c.manual} are manual-only (--only).`);
}

function listCounts(gates) {
  const byTier = { fast: 0, build: 0, live: 0 };
  for (const g of gates) byTier[g.tier] = (byTier[g.tier] ?? 0) + 1;
  return {
    total: gates.length,
    inCi: gates.filter((g) => ciList(g.ci).length > 0).length,
    viaCi: gates.filter((g) => ciList(g.ci).length === 0 && g.ciVia).length,
    localOnly: gates.filter((g) => ciList(g.ci).length === 0 && !g.ciVia).length,
    warnTier: gates.filter((g) => !g.blocking).length,
    manual: gates.filter((g) => g.autorun === false).length,
    byTier,
  };
}

// ── --check-ci ──────────────────────────────────────────────────────────────

/**
 * Parse the workflow far enough to answer two questions and no further: what
 * jobs exist (by their `name:`), and which `pnpm run <script>` calls appear
 * inside each. Deliberately NOT a YAML parser — a dependency-free line scanner
 * that a reader can check by eye is the right size for a fact this narrow.
 */
export function parseWorkflow(text) {
  const lines = text.split(/\r?\n/);
  const jobs = [];
  let current = null;
  let inJobs = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^jobs:\s*$/.test(line)) { inJobs = true; continue; }
    if (!inJobs) continue;

    const jobKey = line.match(/^ {2}([A-Za-z0-9_-]+):\s*$/);
    if (jobKey) {
      current = { key: jobKey[1], name: null, body: [], scripts: [] };
      jobs.push(current);
      continue;
    }
    if (!current) continue;
    const name = line.match(/^ {4}name:\s*(.+?)\s*$/);
    if (name && current.name === null) {
      current.name = name[1].replace(/^['"]|['"]$/g, '');
      continue;
    }
    current.body.push(line);
    if (/^\s*#/.test(line)) continue; // a comment mentioning a script is not an invocation
    for (const m of line.matchAll(/pnpm run ([A-Za-z0-9:_-]+)/g)) current.scripts.push(m[1]);
  }

  for (const j of jobs) {
    if (!j.name) j.name = j.key; // GitHub falls back to the key when `name:` is absent
    j.bodyText = j.body.join('\n');
    j.scripts = [...new Set(j.scripts)];
  }
  return jobs;
}

/**
 * The distinctive string to look for inside a job body when a gate is NOT
 * invoked as `pnpm run <npmScript>` — CI runs several of them as
 * `node scripts/x.js --base ...` or as a workspace filter. Returns null when the
 * command is inline shell with no locatable token, which is REPORTED as
 * unverified rather than passed.
 */
export function evidenceToken(command) {
  const path = command.match(/(?:scripts|libs|apps)\/[\w./-]+/);
  if (path) return path[0];
  const filter = command.match(/pnpm --filter [^&|]+/);
  if (filter) return filter[0].trim();
  return null;
}

function checkCi(opts, manifest) {
  if (!existsSync(opts.workflow)) {
    console.error(`run-gates --check-ci: no workflow at ${opts.workflow}`);
    process.exit(3);
  }
  const jobs = parseWorkflow(readFileSync(opts.workflow, 'utf8'));
  const jobNames = new Set(jobs.map((j) => j.name));
  const gates = manifest.gates;
  const byScript = new Map();
  for (const g of gates) if (g.npmScript) byScript.set(g.npmScript, g);

  const drift = [];
  const unverified = [];
  const push = (direction, gateId, message) => drift.push({ direction, gate: gateId, message });

  // ── (a) manifest -> workflow: a claimed job must exist ────────────────────
  for (const g of gates) {
    if (g.ci === 'unknown') {
      push('a', g.id, 'ci is "unknown" — it has not been determined. Grep the workflow and record the job name, or null.');
      continue;
    }
    for (const name of ciList(g.ci)) {
      if (!jobNames.has(name)) {
        push('a', g.id, `claims CI job "${name}", which does not exist in ${relFrom(opts.root, opts.workflow)}. Renaming a job means updating gates.json.`);
      }
    }
  }

  // ── (a2) manifest -> workflow: a claimed job must actually invoke it ──────
  // For npm-aliased gates whose `command` really is `pnpm run <script>`, the
  // declared job set must EQUAL the observed one — that catches a claim the
  // workflow does not back AND a job that was added without updating the entry.
  for (const g of gates) {
    if (!g.npmScript) continue;
    const declared = new Set(ciList(g.ci).filter((n) => jobNames.has(n)));
    const invokedViaPnpm = g.command.trim().startsWith(`pnpm run ${g.npmScript}`);
    if (!invokedViaPnpm) continue; // handled by the evidence-token pass below
    const observed = new Set(jobs.filter((j) => j.scripts.includes(g.npmScript)).map((j) => j.name));
    for (const n of declared) {
      if (!observed.has(n)) push('a', g.id, `claims CI job "${n}", but that job never runs \`pnpm run ${g.npmScript}\`.`);
    }
    for (const n of observed) {
      if (!declared.has(n)) push('b', g.id, `job "${n}" runs \`pnpm run ${g.npmScript}\`, but the gate's \`ci\` does not list it.`);
    }
  }

  // ── (a3) gates CI runs by file path or workspace filter ───────────────────
  for (const g of gates) {
    const viaPnpmAlias = g.npmScript && g.command.trim().startsWith(`pnpm run ${g.npmScript}`);
    if (viaPnpmAlias) continue;
    const names = ciList(g.ci).filter((n) => jobNames.has(n));
    if (names.length === 0) continue;
    const token = evidenceToken(g.command);
    for (const name of names) {
      const job = jobs.find((j) => j.name === name);
      if (!token) {
        unverified.push(`${g.id}: job "${name}" exists, but the gate's command is inline shell with no locatable token — job existence verified, invocation NOT verified.`);
        continue;
      }
      if (!job.bodyText.includes(token)) {
        push('a', g.id, `claims CI job "${name}", but that job's steps never mention "${token}".`);
      }
    }
  }

  // ── (b) workflow -> manifest: every `pnpm run X` must be declared ─────────
  for (const job of jobs) {
    for (const script of job.scripts) {
      const g = byScript.get(script);
      if (!g) {
        push('b', script, `job "${job.name}" runs \`pnpm run ${script}\`, which has no entry in .altitude/gates.json. Add one (or the manifest is no longer an inventory).`);
        continue;
      }
      if (!ciList(g.ci).includes(job.name)) {
        // Already reported by (a2) for pnpm-aliased gates; report here for the rest.
        const viaPnpmAlias = g.command.trim().startsWith(`pnpm run ${g.npmScript}`);
        if (!viaPnpmAlias) push('b', g.id, `job "${job.name}" runs \`pnpm run ${script}\`, but the gate's \`ci\` does not list that job.`);
      }
    }
  }

  const workflowScripts = new Set(jobs.flatMap((j) => j.scripts));
  const summary = {
    workflow: relFrom(opts.root, opts.workflow),
    jobs: jobs.length,
    workflowScripts: workflowScripts.size,
    gates: gates.length,
    declaredInCi: gates.filter((g) => ciList(g.ci).length > 0).length,
    localOnly: gates.filter((g) => ciList(g.ci).length === 0 && !g.ciVia).length,
    transitive: gates.filter((g) => ciList(g.ci).length === 0 && g.ciVia).length,
    drift,
    unverified,
  };

  if (opts.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`run-gates --check-ci: ${summary.gates} gates vs ${summary.jobs} jobs in ${summary.workflow}`);
    console.log(`  ${summary.workflowScripts} distinct \`pnpm run\` scripts invoked by the workflow`);
    console.log(`  ${summary.declaredInCi} gates declare a CI job, ${summary.transitive} run transitively, ${summary.localOnly} are LOCAL ONLY`);
    if (unverified.length) {
      console.log(`\n  ${unverified.length} entr(ies) only partially verifiable — reported, not passed silently:`);
      for (const u of unverified) console.log(`    ? ${u}`);
    }
    if (drift.length === 0) {
      console.log('\nPASS — the manifest and the workflow agree in both directions.');
    } else {
      console.log(`\n${drift.length} disagreement(s):`);
      for (const d of drift) {
        const dir = d.direction === 'a' ? 'manifest->workflow' : 'workflow->manifest';
        console.log(`  FAIL [${dir}] ${d.gate}: ${d.message}`);
      }
      console.log('\nThe `ci` field is a FACT about the workflow, not a preference. Fix the manifest, or fix the workflow.');
    }
  }
  process.exit(drift.length > 0 ? 1 : 0);
}

const relFrom = (root, p) => p.startsWith(root) ? p.slice(root.length + 1).replace(/\\/g, '/') : p;

// ── main ────────────────────────────────────────────────────────────────────

const opts = parseArgs(process.argv.slice(2));
const manifest = loadManifest(opts.manifest);
if (opts.checkCi) checkCi(opts, manifest);
else if (opts.list) list(opts, manifest);
else await run(opts, manifest);
