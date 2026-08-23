# Claim Spec from Teammate

Claim a teammate's spec from a ghost card, scaffolding a new local spec and recording the claim so the team sees it was picked up.

## Usage

```
/mm:claim {spec-name} --from {teammate-name}
```

Both `{spec-name}` and `--from {teammate-name}` are required.

- `{spec-name}` — partial or full name of the spec to claim (fuzzy match)
- `{teammate-name}` — partial or full display name of the teammate who owns the spec (fuzzy match)

## Instructions

### Step 1: Check Team Entitlement

Invoke the `check_team_entitlement` Tauri command.

- If it returns `false`:
  - Output: **"Team features require a paid plan."**
  - Tell the user: `Upgrade to a Team plan to enable spec claiming, team check-ins, and ghost cards.`
  - **Stop here. Do not continue.**
- If it returns `true`: proceed to Step 2.

### Step 2: Parse Arguments

Parse the user's input to extract:

- `spec-name`: the text before `--from`
- `teammate-name`: the text after `--from`

If either is missing, show usage help and stop:

```
Usage: /mm:claim {spec-name} --from {teammate-name}

  {spec-name}      — name (or partial name) of the spec to claim
  --from {name}    — display name (or partial name) of the teammate who owns it

Example: /mm:claim auth-service --from Alice
```

### Step 3: Fetch Team Check-ins

Invoke the `fetch_team_checkins` Tauri command with:

- `project_path`: the current project's root path

This returns a list of `TeamCheckin` objects. If the list is empty, display:

```
No team check-ins found. Ask teammates to run /mm:checkin first.
```

Then stop.

### Step 4: Find the Matching Spec

1. **Find the teammate**: Search `TeamCheckin` entries for a `display_name` that contains `{teammate-name}` (case-insensitive partial match). If no match is found, list available teammates and stop.
2. **Find the spec**: Search the matched teammate's `specs` array for a spec whose `name` contains `{spec-name}` (case-insensitive partial match). If no match is found, list the teammate's specs and stop.

If multiple matches are found for either, list the matches and ask the user to be more specific.

### Step 5: Check for Duplicate Claims

Invoke the `fetch_claims` Tauri command with:

- `project_path`: the current project's root path

Check if a claim already exists for the same `(spec_name, claimed_from_user_id)` pair.

If a duplicate is found, display:

```
This spec has already been claimed by {claimed_by_display_name} on {claimed_at}.
```

Then stop.

### Step 6: Scaffold Local Spec

Use the `create_spec_cmd` Tauri command (or manually create the spec folder) to scaffold a new local spec:

- `name`: the matched spec's name from the ghost card
- `description`: `"Claimed from {teammate display_name} on {YYYY-MM-DD}"`

The scaffolded spec will have:

- `spec.md` with the spec name and claim origin in the description
- `implementation.md` with empty `## Completed`, `## In Progress`, and `## Backlog` sections

No tasks, requirements, or content are transferred from the original owner.

### Step 7: Record the Claim

Invoke the `claim_spec` Tauri command with:

- `project_path`: the current project's root path
- `spec_name`: the matched spec's name
- `claimed_from_user_id`: the matched teammate's `user_id`
- `team_id`: the matched teammate's `team_id`

### Step 8: Output Confirmation

Display a clear confirmation:

```
Spec claimed successfully.

  Spec:      {spec name}
  From:      {teammate display_name}
  Local:     .mm/specs/{YYYY-MM-DD-slug}/
  Claimed:   {timestamp}

The team will see this claim on their next sync. Run /mm:team-status to verify.
```

---

## Related Commands

- `/mm:team-status` -- View what all team members are working on
- `/mm:checkin` -- Push your team check-in
- `/mm:spec` -- Create a spec from scratch (not from a ghost card)
