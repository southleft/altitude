#!/usr/bin/env bash
# Self-test for the P0 gate scripts.
#
# Builds a synthetic git history with three commits — clean, deliberately-bad,
# migration-only — and asserts the two gates produce the expected exit codes.
#
# Runs in a throwaway worktree so it doesn't disturb the host repo state.

set -euo pipefail
cd "$(dirname "$0")/../.."

WORKTREE="$(mktemp -d)/altitude-gate-test"
BASE_REF="$(git rev-parse HEAD)"
TRAP_TARGETS=()

trap 'for d in "${TRAP_TARGETS[@]:-}"; do git worktree remove --force "$d" >/dev/null 2>&1 || true; rm -rf "$d"; done' EXIT

git worktree add -b "_self-test-$$" "$WORKTREE" "$BASE_REF" >/dev/null
TRAP_TARGETS+=("$WORKTREE")

run_in_worktree() (
  cd "$WORKTREE"
  "$@"
)

step() { echo; echo "==> $*"; }

PASS=0
FAIL=0

assert_exit() {
  local desc="$1" expected="$2" actual="$3"
  if [[ "$expected" == "$actual" ]]; then
    echo "  ✓ $desc (exit=$actual)"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $desc (expected exit=$expected, got exit=$actual)"
    FAIL=$((FAIL + 1))
  fi
}

step "1. Clean PR (no changes) — both gates should pass"
set +e
run_in_worktree node scripts/check-migration-gate.js --base="$BASE_REF" >/dev/null 2>&1
assert_exit "migration-gate (clean)" 0 $?
run_in_worktree node scripts/check-baselines-gate.js --base="$BASE_REF" >/dev/null 2>&1
assert_exit "baselines-gate (clean)" 0 $?
set -e

step "2. Deliberately-bad PR — modify a legacy component, no manifest flip"
( cd "$WORKTREE"
  echo "// touch" >> libs/al-web-components/components/button/button.ts
  git add -A
  git -c user.email=test@test -c user.name=test commit -m "bad: touch legacy button" >/dev/null
)
set +e
run_in_worktree node scripts/check-migration-gate.js --base="$BASE_REF" >/dev/null 2>&1
assert_exit "migration-gate (bad PR — touches legacy)" 1 $?
set -e

step "3. Migration-only PR — flip button to dual and touch it"
( cd "$WORKTREE"
  # Reset back to base, then make the migration-only commit
  git reset --hard "$BASE_REF" >/dev/null
  echo "// touch" >> libs/al-web-components/components/button/button.ts
  node -e "
    const fs = require('fs');
    const m = JSON.parse(fs.readFileSync('.altitude/migration.json','utf8'));
    m.components.button = { state: 'dual', react19: false, headless: false, ssr: false, expiry: '2.1.0' };
    fs.writeFileSync('.altitude/migration.json', JSON.stringify(m, null, 2) + '\n');
  "
  git add -A
  git -c user.email=test@test -c user.name=test commit -m "migrate button to dual" >/dev/null
)
set +e
run_in_worktree node scripts/check-migration-gate.js --base="$BASE_REF" >/dev/null 2>&1
assert_exit "migration-gate (migration-only PR — flips legacy→dual)" 0 $?
set -e

step "4. Build-config change without baselines update — baselines gate fails"
( cd "$WORKTREE"
  git reset --hard "$BASE_REF" >/dev/null
  echo "// touch" >> libs/al-web-components/webpack.config.js
  git add -A
  git -c user.email=test@test -c user.name=test commit -m "edit webpack" >/dev/null
)
set +e
run_in_worktree node scripts/check-baselines-gate.js --base="$BASE_REF" >/dev/null 2>&1
assert_exit "baselines-gate (build change, no baseline update)" 1 $?
set -e

step "5. Build-config change WITH baselines update — baselines gate passes"
( cd "$WORKTREE"
  git reset --hard "$BASE_REF" >/dev/null
  echo "// touch" >> libs/al-web-components/webpack.config.js
  mkdir -p .altitude/baselines
  echo "{}" > .altitude/baselines/bundle-size.json
  git add -A
  git -c user.email=test@test -c user.name=test commit -m "edit webpack + baseline" >/dev/null
)
set +e
run_in_worktree node scripts/check-baselines-gate.js --base="$BASE_REF" >/dev/null 2>&1
assert_exit "baselines-gate (build change + baseline update)" 0 $?
set -e

echo
echo "Self-test: $PASS passed, $FAIL failed"
git worktree remove --force "$WORKTREE" >/dev/null 2>&1 || true
TRAP_TARGETS=()
[[ "$FAIL" -eq 0 ]]
