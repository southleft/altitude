# Create Issue (Monday Morning)

Create a new issue with streamlined input and Monday Morning visibility.

## Entity Format Reference (load first)

Before creating or editing any `.mm/` entity file, Read `<project_path>/.mm/reference/entity-format.md` — it is the authoritative on-demand reference for file formats, folder naming, frontmatter, and dashboard rules. If the file does not exist (legacy install), fall back to the "Monday Morning Entity Reference" section of the managed `.claude/CLAUDE.md` block. Do not proceed from memory.

## Quick Create Mode

If the user provides a description upfront, extract what you can and only ask for missing critical info.

Example: "There's a bug where the refresh button doesn't update the detail view"

- Title: Refresh button doesn't update detail view
- Severity: Infer from context (bug = Medium default)
- Description: Extracted from user input

## Gather Information

Ask the user for (in a conversational way, not a form):

**Required:**

- **Issue title** - Short descriptive name
- **What's happening?** - Description of the problem

**Optional (offer but don't require):**

- **Severity** - Critical, High, Medium (default), Low
- **Steps to reproduce** - How to trigger the issue
- **Expected vs Actual** - What should happen vs what does happen

## Create Issue via MCP Tool

Use the `mcp__monday-morning__mm_create` tool with `entity: "issue"`:

```
entity: "issue"
project_path: {absolute project path}
title: {Issue Title}
description: {Description of the problem}
severity: {severity - critical, high, medium, or low}
```

This automatically:

- Creates the issue file at `.mm/issues/{slug}-{MM-DD-YYYY}.md`
- Updates `.mm/issues/issues.md` dashboard with checkbox entry
- Uses correct formatting and severity tags

## Confirm Creation

```
Issue Created

{emoji} {Title}
Severity: {Severity}
File: .mm/issues/{filename}

View in Monday Morning > Issues tab

Quick actions:
- /mm:issue-close - When resolved
- Start investigating the issue now
```

### Severity Emojis

- Critical: red circle
- High: orange circle
- Medium: yellow circle
- Low: green circle

## Link to Feature or Spec (Optional)

If the issue clearly relates to a feature or spec area, ask:

"Which feature or spec does this relate to? (optional)"

If a feature is identified, read `.mm/features/{feature-slug}/feature.json` for its `linked_specs` to find the most relevant spec. Then append to the created issue file:

```markdown
## Related

**Feature:** [{Feature Name}](../features/{feature-slug}/)
**Spec:** [{Spec Name}](../specs/{spec-folder}/)
```

This linking ensures that when converting an issue to a spec, the feature context is already known — no broad project scan needed.

## MCP Tools Used

| Step         | Tool                                                    | Purpose                                            |
| ------------ | ------------------------------------------------------- | -------------------------------------------------- |
| Create issue | `mcp__monday-morning__mm_create` with `entity: "issue"` | Creates issue file and updates issues.md dashboard |
