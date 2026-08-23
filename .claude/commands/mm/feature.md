# Create Feature (Monday Morning)

Create a new feature to group related specs together for progress tracking.

> **Features are optional.** A feature is just a label for grouping related specs on the dashboard.
> It does **not** drive build order — that comes from each spec's `depends_on` and
> `/mm:order-specs`. You never need a feature to create or sequence a spec; reach for one only when
> grouping genuinely helps at-a-glance progress tracking.

## Quick Create Mode

If the user provides a feature name upfront, create immediately using the MCP tool.

## Gather Information

Ask conversationally for:

**Required:**

- **Feature name** - Human-readable name (e.g., "Trello Integration")

**Optional:**

- **Description** - What this feature accomplishes
- **Priority** - high, medium, or low (default: medium)
- **Link existing specs?** - If there are existing specs to link

## Create Feature via MCP Tool

Use the `mcp__monday-morning__mm_create` tool with `entity: "feature"`:

```
entity: "feature"
project_path: {absolute project path}
name: {Feature Name}
description: {description}
priority: {priority}
id: {optional - auto-generated from name if not provided}
```

This automatically:

- Generates the feature ID (slug) from the name
- Creates `.mm/features/{feature-id}/feature.json`
- Sets status to "planning", initializes progress and linked_specs

## Link Existing Specs (Optional)

If user wants to link existing specs, use `mcp__monday-morning__mm_link` with `entity: "spec"` for each:

```
entity: "spec"
project_path: {absolute project path}
spec_path: {spec folder name}
feature_id: {feature-id}
```

This automatically:

- Normalizes the spec path
- Adds to `linked_specs` with correct relative path format
- Updates `total_specs` count
- Updates `updated` timestamp
- Handles deduplication (won't double-link)

## Confirm Creation

```
Feature Created

Name: {Feature Name}
ID: {feature-id}
Status: planning
Priority: {priority}
Linked Specs: {count} specs

File: .mm/features/{feature-id}/feature.json

View in Monday Morning > Features
```

## Auto-Flow: Feature -> Spec -> Tasks

After creating the feature, automatically continue into spec creation (same conversation):

1. Show the feature confirmation summary (as above)
2. Then immediately ask: **"Let's create a spec for this feature. What's the first thing you want to build?"**
3. If the user provides a description, proceed with the `/mm:spec` workflow using MCP tools
4. If the user says "no", "skip", "not now", or similar -- stop the flow and end with the feature confirmation only

**The goal is one continuous conversation, not three separate commands.**

## MCP Tools Used

| Step           | Tool                                                      | Purpose                             |
| -------------- | --------------------------------------------------------- | ----------------------------------- |
| Create feature | `mcp__monday-morning__mm_create` with `entity: "feature"` | Creates directory and feature.json  |
| Link specs     | `mcp__monday-morning__mm_link` with `entity: "spec"`      | Links existing specs to the feature |
