---
name: project_altitude_v2_plan
description: Altitude v2 next-gen upgrade plan — phases, gates, task IDs, and the parallel-pipeline strategy
metadata:
  type: project
---

The authoritative plan lives at `NEXT-GEN-UPGRADE-PLAN.md` at the repo root (checkouts vary by machine — resolve relative to the repo, not an absolute path). Phases run T0 → T6 with explicit Gate P0..P6 between them. Pilot components: button, input, combobox/select, dialog, theme-switcher.

Why: Brad is evolving Altitude (not rebuilding it) onto DTCG + SD v5 + Vite + Storybook 10 + React 19 + scoped `<al-theme>` host + Lit SSR, validated by a 3-AI red team.

How to apply: When reviewing a phase, re-read the relevant Phase section first and quote the Acceptance line for each task verbatim. Do not relitigate decisions already locked (SD v5, parallel pipeline, decorator semantics preserved per G7, etc.). Gate verdicts must compare *what code does* to *what plan demands* per criterion. Related: [[project_phase1_token_pipeline]].
