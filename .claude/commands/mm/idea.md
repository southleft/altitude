# Capture Idea (Monday Morning)

Quickly capture a feature idea, enhancement, or concept for later exploration.

Ideas are lightweight - they can evolve into specs later but start as raw thoughts.

## Quick Capture Mode

If the user provides an idea upfront, capture it immediately:

Example: "Idea: Add keyboard shortcuts for common actions"

- Title: Keyboard Shortcuts for Common Actions
- Raw idea captured as-is
- Created immediately

## Gather Information

Ask conversationally for:

**Required:**

- **What's the idea?** - The raw concept

**Optional (can be filled in later):**

- **Problem it solves** - Why this matters
- **Potential approaches** - Initial thoughts on implementation

## Create the Idea

Call the MCP tool — it owns the `.mm/ideas/YYYY-MM-DD-{slug}/idea.md` layout the desktop
scans (title H1, section order, status checklist, capture timestamp), so never hand-write it:

```
mm_create({
  entity: "idea",
  project_path: <absolute project root>,
  title: "{Title}",
  raw_idea: "{The user's idea as captured — keep it in their words}",
  problem: "{optional — why it matters}",
  approaches: "{optional — initial implementation thoughts}",
  open_questions: ["{optional extra questions}"]
})
```

Omitted `problem`/`approaches` render as "To be explored during shaping"; the standard
MVP-scope and priority questions are always appended to `open_questions`.

## Confirm Creation

```
Idea Captured

{Title}
Folder: `.mm/ideas/YYYY-MM-DD-{slug}/`

View in Monday Morning > Ideas

When ready to develop this idea:
  /mm:spec - Shape and write a full specification
```

## Expand Mode

If the user wants to expand on the idea:

"Would you like to add more context to this idea?"

If yes, ask:

1. What problem does this solve?
2. Do you have any initial thoughts on implementation?
3. Are there any constraints or considerations?
4. What priority would you give this?

Update the idea.md with the additional context.

## Convert to Spec

If the user says "let's spec this" or "ready to build this":

1. Run the `/mm:spec` workflow
2. Pass the idea content as the initial description
3. Pass the idea folder as `idea_folder` to `mm_create` (spec.md step 1) — it reads the idea and stamps `shaped_to` on it
4. Link the idea to the new spec:

Add to idea.md:

```markdown
## Converted to Spec

This idea has been developed into a full specification:
[{Spec Name}](../specs/YYYY-MM-DD-{spec-slug}/)
```

## Batch Capture

If the user has multiple ideas:

"Ideas:

- Dark mode support
- Export to PDF
- Team collaboration features"

Create each with its own `mm_create({entity: "idea", ...})` call:

```
.mm/ideas/2025-11-29-dark-mode-support/
.mm/ideas/2025-11-29-export-to-pdf/
.mm/ideas/2025-11-29-team-collaboration-features/
```

Confirm:

```
3 Ideas Captured

- Dark Mode Support
- Export to PDF
- Team Collaboration Features

All visible in Monday Morning > Ideas
```

## Idea Triage

Periodically, suggest reviewing ideas:

"You have X ideas captured. Want to triage them?

- Promote to spec (ready to build)
- Keep for later (still exploring)
- Archive (no longer relevant)"
