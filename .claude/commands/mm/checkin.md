# Team Check-in

Push a team check-in so teammates can see what you're working on. Check-ins are stored in the cloud database (when available) -- not via git.

## Usage

```
/mm:checkin
/mm:checkin Working on the auth flow, should be done by EOD
```

## Instructions

### Step 1: Check Team Entitlement

Invoke the `check_team_entitlement` Tauri command.

- If it returns `false`:
  - Output: **"Team features are not available on your current plan."**
  - Tell the user: `Upgrade to a Team plan to enable team check-ins and ghost cards.`
  - **Stop here. Do not continue.**
- If it returns `true`: proceed to Step 2.

### Step 2: Collect Status Note

- If the user provided text after `/mm:checkin`, use that as the `status_note`.
- If no text was provided, ask: **"Any status note to share with your team? (optional, press Enter to skip)"**
- If the user skips or provides empty input, set `status_note` to an empty string `""`.

### Step 3: Push Check-in

Invoke the `push_team_checkin` Tauri command with:

- `project_path`: the current project's root path
- `status_note`: the note from Step 2

This command automatically collects:

- Current git branch (via `git branch --show-current`)
- All spec names and statuses (from `.mm/specs/*/implementation.md`)
- All feature names and statuses (from `.mm/features/*/feature.json`)
- User identity (from `git config user.name`)

### Step 4: Show Confirmation

Display a clear confirmation of what was pushed:

```
Team check-in pushed.

  User:     {display_name}
  Branch:   {branch}
  Specs:    {comma-separated spec names with statuses, or "None"}
  Features: {comma-separated feature names with statuses, or "None"}
  Note:     "{status_note}" (or "None" if empty)
  Time:     {checked_in_at}
```

---

## Related Commands

- `/mm:team-status` -- View what all team members are working on
- `/mm:context` -- Load full project context
- `/mm:review --health` -- Run project health scan
