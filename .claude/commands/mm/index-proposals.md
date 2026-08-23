# Index Proposals (Monday Morning)

Scan all proposals in `.mm/proposals/` and generate an up-to-date `proposals-index.md` dashboard.

## Usage

```
/mm:index-proposals
```

No arguments required. This command is idempotent — it always regenerates the full index from source files.

---

## Process

### 1. Scan Proposal Folders

Scan every subdirectory of `.mm/proposals/` (excluding `approved/` and any non-directory entries). For each folder, find `.md` files that contain YAML frontmatter with a `type` field.

Supported types: `proposal`, `sow`, `estimate`, `change-order`

### 2. Extract Metadata from Frontmatter

For each matching `.md` file, read the YAML frontmatter and extract:

| Field            | Frontmatter Key    | Required | Default if Missing       |
| ---------------- | ------------------ | -------- | ------------------------ |
| Client           | `client`           | yes      | _(skip file if missing)_ |
| Title            | `title`            | yes      | _(skip file if missing)_ |
| Date             | `date`             | yes      | _(skip file if missing)_ |
| Status           | `status`           | no       | —                        |
| Document Type    | `type`             | yes      | —                        |
| Engagement Type  | `engagement_type`  | no       | —                        |
| Investment Range | `investment_range` | no       | —                        |

If `client`, `title`, or `date` are missing, skip that file with a warning.

### 3. Generate proposals-index.md

Write the file `.mm/proposals/proposals-index.md` with the following structure:

```markdown
# Proposals Index

Last updated: {today's date in YYYY-MM-DD format}

## All Proposals

| Client   | Title   | Date   | Status        | Type   | Engagement             | Investment              | Link                          |
| -------- | ------- | ------ | ------------- | ------ | ---------------------- | ----------------------- | ----------------------------- |
| {client} | {title} | {date} | {status or —} | {type} | {engagement_type or —} | {investment_range or —} | [View](./{folder}/{filename}) |

## By Engagement Type

### Greenfield Build

- [{client} - {title}](./{folder}/{filename}) — {investment_range or —}, {status or —}

### Design System

_(no proposals yet)_

### Audit / Consulting

_(no proposals yet)_

### Team Augmentation

_(no proposals yet)_

### Maintenance Retainer

_(no proposals yet)_

### Migration

_(no proposals yet)_

### MVP

_(no proposals yet)_

### Other / Unspecified

- Proposals without an engagement_type go here

## By Status

### Accepted

- {client} - {title} ({date})

### Sent

_(none)_

### Draft

- {client} - {title} ({date})

### Declined

_(none)_
```

### 4. Engagement Type Mapping

Map `engagement_type` frontmatter values to section headings:

| Frontmatter Value           | Section Heading      |
| --------------------------- | -------------------- |
| `greenfield-build`          | Greenfield Build     |
| `design-system`             | Design System        |
| `audit-consulting`          | Audit / Consulting   |
| `team-augmentation`         | Team Augmentation    |
| `maintenance-retainer`      | Maintenance Retainer |
| `migration`                 | Migration            |
| `mvp`                       | MVP                  |
| _(missing or unrecognized)_ | Other / Unspecified  |

### 5. Sorting

- **All Proposals table**: Sort by date descending (most recent first)
- **By Engagement Type sections**: Sort each section by date descending
- **By Status sections**: Sort each section by date descending

### 6. Output Confirmation

After generating the index, print:

```
Proposals Index Updated

  proposals indexed    {count}
  engagement types     {count of distinct types found}
  path                 .mm/proposals/proposals-index.md

Run /mm:index-proposals again any time after adding or importing proposals.
```

## Rules

- Always regenerate from scratch — never append or patch the existing index
- Handle missing optional frontmatter fields gracefully with "—" placeholder
- Skip files that lack `type`, `client`, `title`, or `date` in frontmatter
- Include ALL document types (proposal, sow, estimate, change-order) in the index
- Relative links in the index should work from the `.mm/proposals/` directory

## Related Commands

- `/mm:proposal` — Create a new proposal
- `/mm:import-proposal` — Import a .docx or .pdf proposal
- `/mm:export-proposal` — Export proposal to branded PDF
