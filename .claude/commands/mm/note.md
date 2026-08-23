# Create Note (Monday Morning)

Capture a note, decision, or piece of documentation.

## Quick Create Mode

If the user provides content upfront, create immediately:

Example: "Note: We decided to use PostgreSQL instead of MongoDB for better relational support"

- Title: Database decision - PostgreSQL over MongoDB
- Category: Decision
- Content: Extracted from user input

## Gather Information

Ask conversationally for:

**Required:**

- **What do you want to note?** - The content

**Inferred/Optional:**

- **Title** - Short name (can be auto-generated from content)
- **Category** - Auto-detect or ask:
  - Decision - Architectural or design decisions
  - Meeting - Meeting notes
  - Research - Investigation findings
  - Architecture - System design notes
  - Development - Dev notes, tips, gotchas
  - Other - Anything else

## Create the Note

Call the MCP tool — it owns the filename convention, frontmatter, timestamps, and the
`notes.md` dashboard row (checkbox format included), so never hand-write those:

```
mm_create({
  entity: "note",
  project_path: <absolute project root>,
  title: "{Note Title}",
  category: "{Category}",
  content: "{body markdown — see composition below}"
})
```

**Compose `content`** — everything below the title/category header. For a plain note:

```markdown
## Content

{Content}

## Related

{Related items or links if mentioned}
```

For **Decision** and **Meeting** notes, use the enhanced section templates below as the
`content` instead.

## Confirm Creation

```
Note Saved

{Title}
Category: {Category}
File: `.mm/notes/{filename}`

View in Monday Morning > Notes
```

## Special Categories

### Decision Notes

When category is "Decision", pass this as `content`:

```markdown
**Status:** Decided

## Context

{Why was this decision needed?}

## Decision

{What was decided}

## Alternatives Considered

{Other options that were evaluated}

## Consequences

{Impact of this decision}
```

### Meeting Notes

When category is "Meeting", pass this as `content`:

```markdown
**Attendees:** {List or "Not specified"}

## Agenda

{Topics discussed}

## Notes

{Key points}

## Action Items

- [ ] {Action item 1}
- [ ] {Action item 2}

## Next Steps

{Follow-up items}
```

## Link to Spec (Optional)

If the note relates to a spec:

"Is this note related to a spec you're working on?"

If yes, include in `content`:

```markdown
## Related Spec

[{Spec Name}](../specs/{spec-folder}/)
```
