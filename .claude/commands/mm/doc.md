# Create Doc (Monday Morning)

Create a living reference document — API docs, architecture guides, runbooks, onboarding guides.

Unlike notes (temporal snapshots), docs are meant to be kept current and referenced repeatedly.

## Quick Create Mode

If the user provides content upfront, create immediately using the `mcp__monday-morning__mm_create` tool with `entity: "doc"`:

Example: "Doc: API Authentication Guide - explains how our OAuth2 flow works with refresh tokens"

- Title: API Authentication Guide
- Category: api (auto-detected from content)
- Content: Extracted/expanded from user input

## Gather Information

Ask conversationally for:

**Required:**

- **What should this doc cover?** - The documentation content

**Inferred/Optional:**

- **Title** - Short descriptive name (can be auto-generated from content)
- **Category** - Auto-detect or ask:
  - api - API documentation
  - architecture - System design and architecture
  - onboarding - Setup and getting started guides
  - runbook - Operational procedures
  - guide - How-to guides and tutorials
  - reference - Technical reference material
  - general - Anything else
- **Source URL** - External canonical URL if the doc originates elsewhere (e.g., wiki page, GitHub docs)

## Create Doc via MCP Tool

Use the `mcp__monday-morning__mm_create` tool with `entity: "doc"`:

```
entity: "doc"
project_path: {absolute project path}
title: {Doc Title}
category: {category}
content: {documentation content}
source_url: {url if provided, omit otherwise}
```

This automatically:

- Creates the doc file at `.mm/docs/{slug}-{MM-DD-YYYY}.md`
- Updates the `.mm/docs/docs.md` dashboard with a new entry under `## Docs`

## Confirm Creation

```
Doc Created

{Title}
Category: {Category}
File: `.mm/docs/{filename}`

View in Monday Morning > Docs
```

## Special: Doc from URL

If the user provides a URL and asks to create a doc from it:

1. Fetch the URL content
2. Extract/summarize the relevant documentation
3. Set the `source_url` to the original URL
4. Create the doc with the extracted content

Example: "Create a doc from https://example.com/api/auth"

## Special: Doc from Conversation

If the user asks to document something discussed in the conversation:

1. Synthesize the key information into clean documentation
2. Structure with appropriate headings
3. Auto-detect category from content
4. Create the doc

Example: "Create a doc from what we just discussed about the auth flow"

## MCP Tools Used

| Step       | Tool                                                  | Purpose                                        |
| ---------- | ----------------------------------------------------- | ---------------------------------------------- |
| Create doc | `mcp__monday-morning__mm_create` with `entity: "doc"` | Creates doc file and updates docs.md dashboard |
