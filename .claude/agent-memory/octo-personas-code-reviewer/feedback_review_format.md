---
name: feedback_review_format
description: Phase-review deliverable shape Brad expects from the code-reviewer agent
metadata:
  type: feedback
---

Phase reviews for Altitude v2 follow a fixed shape: (1) Gate verdict per criterion (met/partial/not-met + file:line evidence + plan-acceptance-quote vs. reality), (2) Substantive findings bucketed as **Blocker** / **Risk** / **Note**, (3) Phase-N+1 readiness (green/yellow/red, one-line reason). Word limit is stated in the request (Phase 1 = 1200).

Why: The plan is gated phase-to-phase; Brad needs a clean signal on whether each gate truly passed and what's load-bearing for the next phase. He explicitly does NOT want me to re-litigate locked decisions, propose collapsing parallel pipelines, or recommend hand-editing generated dirs — he calls those out in scope.

How to apply: Always read the plan's Phase section + its Gate line first, quote the Acceptance verbatim per task, and ground every finding in file:line evidence. Speak to Brad directly ("Brad,") and avoid emojis. Related: [[user_brad]], [[project_altitude_v2_plan]].
