# Product Planning (Monday Morning)

Create product documentation and features for a new project.

## Overview

This command establishes your project's foundation:

1. **Mission** - Product vision, target users, core value
2. **Roadmap** - Prioritized feature list with effort estimates
3. **Tech Stack** - Technology choices
4. **Features** - Monday Morning features created from roadmap

## What Gets Created

| File/Folder                 | Purpose                          |
| --------------------------- | -------------------------------- |
| `.mm/product/mission.md`    | Product vision and strategy      |
| `.mm/product/roadmap.md`    | Development phases with features |
| `.mm/product/tech-stack.md` | Technology choices               |
| `.mm/features/{feature}/`   | One folder per roadmap item      |

---

## Workflow

### PRE-CHECK: Detect Existing Product Docs

Before doing anything, check if product documentation already exists:

1. Check for `.mm/product/mission.md`
2. Check for `.mm/product/roadmap.md`
3. Check for `.mm/product/tech-stack.md`
4. Check for features in `.mm/features/`

**If ANY of these exist**, do NOT proceed with fresh planning. Instead:

1. Read the existing files silently
2. Present a summary to the user:

```
Looks like you already have a product plan:

  Mission:  .mm/product/mission.md  {exists/missing}
  Roadmap:  .mm/product/roadmap.md  {exists/missing}
  Tech Stack: .mm/product/tech-stack.md  {exists/missing}
  Features: {N} features in .mm/features/

What would you like to do?

  [1] Review and update the existing plan
  [2] Start fresh (overwrites existing docs)
  [3] Cancel
```

- If **review/update**: Read the existing docs, show a summary of each, and ask the user what they'd like to change. Only modify the files they want updated. Use `/mm:update-product` logic for targeted updates.
- If **start fresh**: Proceed with PHASE 1 below (confirm the user is sure first).
- If **cancel**: Exit.

**If NONE exist**, proceed directly to PHASE 1.

---

### PHASE 1: Product Planning

Use the **product-planner** subagent to create product documentation.

IF the user has provided details about their product idea, purpose, features, target users, or tech stack, pass those to the **product-planner** subagent.

The product-planner will:

- Gather/confirm product idea, features, target users
- Confirm the tech stack
- Create mission.md, roadmap.md, and tech-stack.md

### PHASE 2: Create Features from Roadmap

After product planning completes, automatically create features:

1. **Read roadmap.md** and parse each numbered item
2. **For each roadmap item**, create:
   ```
   .mm/features/{feature-slug}/feature.json
   ```

**Roadmap format expected:**

```markdown
1. [ ] Feature Name — Description `effort`
2. [ ] Another Feature — Description `effort`
```

**Feature.json created:**

```json
{
  "id": "{slug}",
  "name": "{Feature Name}",
  "description": "{Description}",
  "status": "planning",
  "priority": "medium",
  "effort": "{effort}",
  "roadmap_order": 1,
  "progress": {
    "total_specs": 0,
    "completed_specs": 0,
    "percentage": 0
  },
  "linked_specs": [],
  "created": "{timestamp}",
  "updated": "{timestamp}"
}
```

### PHASE 2.5: Offer Coding Standards

(Absorbed from the retired `/mm:plan-product`.) After product docs and features are created,
offer once:

> Would you like to establish coding standards for this project? If there's existing code, I'll
> analyze it and capture the patterns. For a new project, I'll help you define conventions
> upfront based on your tech stack.

- **Yes + existing code:** run the `/mm:standards` flow (analyze codebase, present findings,
  generate `.mm/standards/` files).
- **Yes + brand-new project:** ask for preferred conventions for the chosen stack (naming, file
  structure, component patterns, testing approach) and generate `.mm/standards/` from the answers.
- **No:** skip — `/mm:standards` works any time later.

### PHASE 3: Confirm and Guide

Output the following:

```
Product Planning Complete!

PRODUCT DOCS
  .mm/product/mission.md     - Product vision
  .mm/product/roadmap.md     - Feature roadmap
  .mm/product/tech-stack.md  - Tech choices

FEATURES CREATED
  1. {Feature Name} → .mm/features/{slug}/
  2. {Feature Name} → .mm/features/{slug}/
  ... (list all created features)

YOUR PROJECT IS SET UP!

The flow from here:

  FEATURE → SPEC → TASKS → IMPLEMENT

For each feature, run:

  /mm:spec {feature-slug}

This creates a spec linked to that feature with:
  - Requirements gathering
  - Detailed specification
  - Task breakdown

Example: /mm:spec user-authentication

Start with your first roadmap item!
```

---

## Feature → Spec → Task Flow

After planning, follow this workflow for each feature:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Feature   │ --> │    Spec     │ --> │    Tasks    │ --> │  Implement  │
│ (from plan) │     │ /mm:spec│     │ (auto-made) │     │/mm:spec-start│
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

1. **Feature** - Created automatically from roadmap
2. **Spec** - Run `/mm:spec {feature}` to create detailed spec
3. **Tasks** - Automatically generated when spec is created
4. **Implement** - Run `/mm:spec-start` to begin implementation

---

## For Existing Projects

If you already have a codebase and want to add Monday Morning:

1. Run `/mm:plan` to create product docs and features
2. Describe your existing product when prompted
3. The roadmap should reflect your current priorities

---

## Related Commands

- `/mm:spec {feature}` - Create a spec for a feature
- `/mm:feature` - Manually add a feature not in roadmap
- `/mm:review --project` - See project status
