# Monday Morning Commands

## Getting Started Flow

```
/mm:plan → /mm:spec → /mm:spec-start
```

1. **Plan** your product (mission, roadmap, features)
2. **Create specs** for each feature
3. **Implement** specs with task tracking

---

## Core Workflow

| Command                 | Purpose                               |
| ----------------------- | ------------------------------------- |
| `/mm:plan`              | Create mission, roadmap, and features |
| `/mm:feature`           | Add a feature manually                |
| `/mm:spec {feature}`    | Create a spec for a feature           |
| `/mm:spec --phase`       | Create specs for a roadmap phase       |
| `/mm:spec-start {spec}` | Start implementing a spec             |
| `/mm:spec-start --all`  | Implement ALL specs sequentially      |
| `/mm:commit`            | Commit current changes                |
| `/mm:complete`          | Full completion workflow              |
| `/mm:audit-command {cmd}` | Audit a command doc (live-run, artifact-gated) |

### Batch Mode (Rapid Setup)

For quick project setup, use the batch commands:

```
/mm:plan              # Creates features from roadmap
/mm:spec --phase      # Creates specs for the current phase
/mm:spec-start --all  # Implements everything
```

---

## Entity Management

| Command             | Purpose                  |
| ------------------- | ------------------------ |
| `/mm:task`          | Create a standalone task |
| `/mm:issue`         | Create an issue          |
| `/mm:note`          | Create a note            |
| `/mm:idea`          | Capture an idea          |
| `/mm:complete --task-only` | Mark a task complete |
| `/mm:issue-close`   | Close an issue           |

---

## Review & Status

| Command                   | Purpose                |
| ------------------------- | ---------------------- |
| `/mm:review --project`    | Review current project |
| `/mm:review --all`        | Review all projects |
| `/mm:spec-status`         | Check spec progress    |

---

## Context Recovery

| Command       | Purpose              |
| ------------- | -------------------- |
| `/mm:context` | Load project context |
| `/mm:pm`      | End of day summary   |

---

## Utilities

| Command                   | Purpose                                  |
| ------------------------- | ---------------------------------------- |
| `/mm:roadmap-to-features` | Create features from roadmap             |
| `/mm:update-product`      | Update product docs for existing project |
| `/mm:setup-auth`          | Set up Supabase authentication           |

---

## The Feature → Spec → Task Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   FEATURE    │ --> │     SPEC     │ --> │    TASKS     │ --> │  IMPLEMENT   │
│  /mm:plan    │     │  /mm:spec    │     │  (auto-made) │     │/mm:spec-start│
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### 1. Features (from /mm:plan)

Created automatically from your roadmap:

```
.mm/features/
├── user-auth/feature.json
├── dashboard/feature.json
└── notifications/feature.json
```

### 2. Specs (from /mm:spec)

Created for each feature with full documentation:

```
.mm/specs/2025-01-02-login-flow/
├── spec.md           # Detailed specification
├── requirements.md   # Requirements gathered
├── implementation.md # Task tracking
└── tasks.md          # Task tracking (copy)
```

### 3. Tasks (auto-generated)

Tasks live in `implementation.md` with this format:

```markdown
## Completed

- [x] Done task

## In Progress

- [ ] Current task

## Backlog

- [ ] Future task
```

### 4. Implementation

Run `/mm:spec-start {spec}` to implement tasks one by one.

---

## Directory Structure

After setup, your project has:

```
.mm/
├── product/
│   ├── mission.md      # Product vision
│   ├── roadmap.md      # Feature roadmap
│   └── tech-stack.md   # Tech choices
├── features/
│   └── {feature}/
│       └── feature.json
├── specs/
│   └── {YYYY-MM-DD-slug}/
│       ├── spec.md
│       ├── implementation.md
│       └── tasks.md
├── tasks/              # Standalone tasks
├── issues/             # Issue tracking
├── notes/              # Project notes
└── config.json         # Project config
```

---

## Daily Workflow

### Morning

1. Run `/mm:context` to recover context
2. Review yesterday's progress
3. Pick tasks to focus on today

### During the Day

4. Work on specs with `/mm:spec-start`
5. Log issues with `/mm:issue`
6. Document decisions with `/mm:note`

### Evening

7. Run `/mm:pm` to document progress
8. Plan tomorrow

---

## Quick Tips

- Always run `/mm:plan` first on a new project
- Use `/mm:spec {feature}` to link specs to features
- Specs without features appear as "ungrouped"
- Section headers in implementation.md MUST use `## ` (two hashes)
- All spec paths use `.mm/` (WITH the dot)
