# Close Issue

Mark an issue as resolved and move it to the Resolved section.

## Step 1: List Open Issues

Read `.mm/issues/issues.md` and display all open issues (from Critical, Open, and In Progress sections):

```
Which issue would you like to close?

[1] 🔴 Add terminal selection support (iTerm, Warp, Terminal) - Critical
[2] 🟡 Theme toggle not showing correct icon - Open
[3] 🟠 Tauri version mismatch - 2.1 does not exist - In Progress

Enter number (or 'q' to quit):
```

If no open issues exist, inform the user:

```
No open issues found. All issues are resolved!
```

## Step 2: Confirm Selection

After user selects an issue, confirm:

```
Close this issue?

  "{Issue Title}"
  Status: {current status}
  Created: {date}

[y] Yes, close it
[n] No, go back
```

## Step 3: Ask for Resolution Notes (Optional)

```
Resolution notes (optional, press Enter to skip):
```

## Step 4: Update Issue File

Read the issue file (e.g., `.mm/issues/tauri-version-mismatch-11-22-2025.md`) and update:

1. **Update frontmatter:**

   ```yaml
   status: resolved
   resolved: { YYYY-MM-DD HH:MM }
   updated: { YYYY-MM-DD HH:MM }
   ```

2. **Update status in body:**

   ```markdown
   **Status:** Resolved ✅
   **Resolved:** {YYYY-MM-DD HH:MM}
   ```

3. **Add to Updates Log:**

   ```markdown
   ### {YYYY-MM-DD HH:MM} - Issue resolved

   {Resolution notes if provided, otherwise "Issue closed"}
   ```

## Step 5: Update Issues Index

Read `.mm/issues/issues.md` and:

1. **Remove from current section** (Critical, Open, or In Progress)
2. **Add to Resolved section** at the top:
   ```markdown
   - [x] {Issue Title} - Resolved {MM-DD-YYYY}
   ```
3. **Update "Last updated" timestamp**

## Step 6: Confirm and Show Remaining

Display confirmation and remaining open issues:

```
✅ Issue closed: "{Issue Title}"

Updated files:
- .mm/issues/{filename}.md
- .mm/issues/issues.md

---

Remaining open issues: {count}

{If count > 0:}
- 🔴 {Critical issue title}
- 🟡 {Open issue title}
...

{If count == 0:}
All issues resolved! 🎉
```

## Notes

- Preserve the issue file (don't delete it) - just update status
- Keep the checkbox format consistent: `- [x]` for resolved
- Maintain chronological order in Resolved section (newest first)
- The severity emoji is removed when moving to Resolved (just use [x])
