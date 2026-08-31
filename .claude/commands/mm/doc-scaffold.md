# Scaffold a Client Document (Monday Morning)

Scaffold a branded client document — estimate, change order, or statement of work — from the
WeekendDevs templates. One parameterized command; absorbed the former `/mm:estimate`,
`/mm:change-order`, and `/mm:sow`.

## Usage

```
/mm:doc-scaffold <type> [client-name] ["Project Title"]
```

- `<type>` — `estimate` | `change-order` | `sow` (required; if omitted, ask which).
- No further args → interactive mode, ask for details. Args → quick mode.

**Examples:**

- `/mm:doc-scaffold sow "Eagle Industries" "Website Analytics Platform"`
- `/mm:doc-scaffold estimate` — interactive

---

## Gather Information

Common to every type (use args when provided, otherwise ask):

1. **Client name** — company name (e.g., "Eagle Industries")
2. **Project title** — what the document is for
3. **Prepared by** — author name (default: "TJ Pitre")
4. **Date** — document date (default: today, formatted like "March 18, 2026")

Type-specific:

| Type           | Extra fields                                                                                                       | Template dir                | Output file       |
| -------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------- | ----------------- |
| `estimate`     | **Valid until** — expiration (default: 30 days from today, same date format)                                       | `.mm/templates/estimate/`   | `estimate.md`     |
| `change-order` | **Original SOW** — reference (e.g., "SOW-001") · **Change order number** (default: "CO-001")                       | `.mm/templates/change-order/` | `change-order.md` |
| `sow`          | **Project start date** (e.g., "April 1, 2026") · **SOW number** (default: "SOW-001")                               | `.mm/templates/sow/`        | `sow.md`          |

## Create the Document

1. Generate a slug from the client name: lowercase, hyphens, no special chars.
2. Read `{template dir}/template.md`.
3. Create the directory `.mm/proposals/{YYYY-MM-DD}-{client-slug}/` and copy the template to
   `{output file}` there. (`.mm/proposals/` carries a legacy label but remains the home of the
   client-document suite — `/mm:export-proposal` and `/mm:index-proposals` read it.)
4. Substitute the variables — common: `{{client}}`, `{{title}}`, `{{prepared_by}}`, `{{date}}`;
   plus per type: `{{valid_until}}` (estimate) · `{{original_sow}}`, `{{change_order_number}}`
   (change-order) · `{{project_start_date}}`, `{{sow_number}}` (sow).

## SOW only: Seed Roadmap Scaffold (if missing)

The Roadmap (`.mm/product/roadmap.md`) should be a direct projection of the SOW's deliverables
and milestones. After creating a SOW:

1. If `roadmap.md` exists AND parses to one or more `## Phase {n}: …` sections — leave it alone.
2. Otherwise run `npx tsx scripts/migrate-roadmap.ts` (seeds an empty Phase 1 scaffold; backs up
   unstructured prior content to `.mm/product/archive/roadmap-pre-migration.md`), then prompt the
   user to derive phases from the SOW deliverables — by editing `roadmap.md` or running
   `/mm:order-specs`.

## Confirm Creation

```
{Estimate | Change Order | Statement of Work} Created

  client    {Client Name}
  title     {Project Title}
  {valid {Valid Until} | co {CO Number} · ref {Original SOW} | sow {SOW Number}}
  path      .mm/proposals/{YYYY-MM-DD}-{client-slug}/{output file}

Edit in any markdown editor, then export to branded PDF:

  /mm:export-proposal {YYYY-MM-DD}-{client-slug}
```

For `sow`, append the roadmap status line: `Roadmap already structured (N phases)` or
`Roadmap scaffold seeded — run /mm:order-specs to populate`.

## Related Commands

- `/mm:proposal` — Create a full client proposal (the heavyweight sibling)
- `/mm:export-proposal` — Export document to branded PDF
- `/mm:index-proposals` — Rebuild the proposals index
