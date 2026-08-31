# Create Features from Roadmap

Parse the product roadmap and create Monday Morning features for each roadmap item.

## Overview

This command bridges product planning with feature tracking:

1. Reads `.mm/product/roadmap.md`
2. Parses each numbered feature item
3. Creates a corresponding feature in `.mm/features/`
4. Links features to future specs

## Prerequisites

- Product roadmap must exist at `.mm/product/roadmap.md`
- Run `/mm:plan` first if roadmap doesn't exist

## Workflow

### Step 1: Read and Parse Roadmap

Read `.mm/product/roadmap.md` and extract features.

**Expected roadmap format:**

```markdown
# Product Roadmap

## Phase 1: Foundations

> Status: in_progress

1. [ ] Feature Name — Description here `effort`
2. [ ] Another Feature — Another description `effort`

## Phase 2: Expansion

> Status: planning

3. [ ] Third Feature — Another description `effort`
```

Roadmap items always live under a `## Phase <number>: <title>` heading — that is what the app's
roadmap parser (`parse-roadmap.ts`) requires, and items outside a phase section are silently
dropped by it. When parsing here:

- **Skip `## Phase ...` heading lines** and `> Status: ...` blockquote lines. They carry phase
  grouping, not features.
- **Item numbering is continuous ACROSS phases** — Phase 2 above starts at `3.`, not at `1.`.
  Use the item's own number as `roadmap_order` so numbers still map 1:1 to `roadmap_order` in
  each `feature.json`. Do NOT restart the count per phase.
- Both `1. [ ]` and `- [ ]` bullets are valid roadmap items.

Parse each item line matching pattern: `\d+\. \[[ x]\] (.+?) — (.+?) \`(.+?)\``

- Group 1: Feature name
- Group 2: Description
- Group 3: Effort estimate

### Step 2: Create Feature Directories

For each parsed feature:

1. **Generate feature slug** from name:
   - Lowercase
   - Replace spaces with hyphens
   - Remove special characters
   - Example: "User Authentication" → "user-authentication"

2. **Create feature directory:**

   ```
   .mm/features/{feature-slug}/
   ```

3. **Create feature.json:**
   ```json
   {
     "id": "{feature-slug}",
     "name": "{Feature Name}",
     "description": "{Description from roadmap}",
     "status": "planning",
     "priority": "medium",
     "effort": "{effort estimate}",
     "roadmap_order": {order number},
     "progress": {
       "total_specs": 0,
       "completed_specs": 0,
       "percentage": 0
     },
     "linked_specs": [],
     "created": "{ISO timestamp}",
     "updated": "{ISO timestamp}"
   }
   ```

### Step 3: Create Features Directory Structure

Ensure `.mm/features/` exists before creating feature subdirectories.

### Step 4: Skip Existing Features

If a feature with the same slug already exists:

- Skip creation
- Report as "already exists"
- Do NOT overwrite

### Step 5: Report Results

Output summary:

```
Features Created from Roadmap

CREATED ({count})
  1. {Feature Name} → .mm/features/{slug}/
  2. {Feature Name} → .mm/features/{slug}/
  ...

SKIPPED ({count}) - already exist
  - {Feature Name}

TOTAL: {created} created, {skipped} skipped

NEXT STEPS
  For each feature, create specs:

  /mm:spec {feature-slug}

  Example: /mm:spec user-authentication
```

## Error Handling

**If roadmap.md doesn't exist:**

```
No roadmap found at .mm/product/roadmap.md

Run /mm:plan first to create your product roadmap,
then run /mm:roadmap-to-features to create features.
```

**If roadmap.md has no parseable features:**

```
No features found in roadmap.md

Expected format:
## Phase 1: Foundations
1. [ ] Feature Name — Description `effort`

Every item must sit under a "## Phase N: <title>" heading.
Check your roadmap format and try again.
```

## Integration with /mm:plan

This command is automatically suggested after `/mm:plan` completes.
It can also be run independently to sync features with an updated roadmap.

## Manual Feature Creation

If you need to add a feature not in the roadmap, use `/mm:feature` instead.
