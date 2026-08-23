# Team Status - View Team Check-ins

Display a formatted summary of all team members' current status from the cloud database.

## Usage

```
/mm:team-status
```

## Workflow

### Step 1: Check Team Entitlement

Invoke the `check_team_entitlement` Tauri command.

If it returns `false`:

- Display this error and stop:

```
Team features are not available on your current plan.

Team check-ins, ghost cards, and team status require a Team plan.
Upgrade at https://mondaymorning.com/pricing to enable team features.
```

- Do NOT proceed to fetch check-ins.

### Step 2: Fetch Team Check-ins

Invoke the `fetch_team_checkins` Tauri command with:

- `project_path`: the current project's root path

This returns a list of `TeamCheckin` objects from the cloud database.

- If the list is empty, display the empty state (Step 2a) and stop.
- For each checkin, use the returned fields:
  - `display_name` -- team member's name
  - `checked_in_at` -- ISO 8601 timestamp
  - `branch` -- git branch they're on
  - `specs` -- array of `{name, status}`
  - `features` -- array of `{name, status}`
  - `status_note` -- free-text status

#### Step 2a: Empty State

If no check-ins are found, display:

```
No team check-ins found.

Team check-ins let teammates see what each person is working on.

To get started:
  1. Run mm:checkin to push your status
  2. Ask teammates to run mm:checkin from their machines
```

Then stop.

### Step 3: Compute Relative Times

For each check-in, compute the relative time since `checked_in_at` compared to now:

- Less than 60 seconds: **"Just now"**
- Less than 60 minutes: **"{N}m ago"** (e.g., "5m ago")
- Less than 24 hours: **"{N}h ago"** (e.g., "2h ago")
- Less than 7 days: **"{N}d ago"** (e.g., "3d ago")
- 7 days or more: **"{N}d ago"** with a **(stale)** suffix (e.g., "10d ago (stale)")

### Step 4: Identify Current User

Run `git config user.name` to get the current user's display name.

Compare this name against each check-in's `display_name` field (case-insensitive) to identify the current user's own entry.

### Step 5: Display Formatted Summary

Output the team status using this format:

```
Team Status
===========

{For each team member, sorted by most recent check-in first:}

{display_name} {you_label} -- {relative_time} {stale_badge}
  Branch:   {branch}
  Specs:    {comma-separated spec names with status, or "None"}
  Features: {comma-separated feature names with status, or "None"}
  Note:     {status_note, or "No status note" if empty}

---
```

Formatting rules:

- **Current user**: Append `(You)` after their name
- **Stale check-ins** (7+ days): Append `[STALE]` badge after the relative time
- **Specs**: Show as `{name} ({status})` comma-separated. If empty, show "None"
- **Features**: Show as `{name} ({status})` comma-separated. If empty, show "None"
- **Note**: Show the status note. If empty, show "No status note"

After all members, display the footer:

```
---
Check-ins are synced via the Monday Morning cloud API.
```

### Step 6: Show Nudge (if applicable)

If the current user (from `git config user.name`) does NOT have a check-in in the results:

Append this nudge after the footer:

```
You haven't checked in yet -- run mm:checkin to share your status.
```

## Example Output

```
Team Status
===========

Alice Smith -- 2h ago
  Branch:   feature/auth-flow
  Specs:    Auth Feature (in-progress), User Dashboard (backlog)
  Features: Authentication (in-progress)
  Note:     Wrapping up auth today, will start dashboard tomorrow

Bob Jones (You) -- 1d ago
  Branch:   main
  Specs:    Team Collaboration (in-progress)
  Features: Team Features (planning)
  Note:     Working on team-status command

Charlie Dev -- 10d ago [STALE]
  Branch:   fix/bug-123
  Specs:    None
  Features: None
  Note:     No status note

---
Check-ins are synced via the Monday Morning cloud API.
```

## Related Commands

- `/mm:checkin` -- Push your team check-in
- `/mm:context` -- Load full project context
- `/mm:review --health` -- Run project health scan
