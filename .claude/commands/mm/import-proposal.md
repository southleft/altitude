# Import Proposal (Monday Morning)

Import a historical proposal from a `.docx` or `.pdf` file into the proposals library as structured markdown with YAML frontmatter.

## Usage

```
/mm:import-proposal /path/to/document.docx "Client Name" "2025-06-15"
/mm:import-proposal /path/to/document.pdf "Client Name"
```

**Arguments:**

1. **File path** (required) -- absolute or relative path to a `.docx` or `.pdf` file
2. **Client name** (required) -- company name in quotes (e.g., "Acme Corp")
3. **Date** (optional) -- proposal date as `YYYY-MM-DD` (default: today's date)

**Examples:**

- `/mm:import-proposal ~/Documents/acme-proposal.docx "Acme Corp" "2025-06-15"`
- `/mm:import-proposal ./old-proposals/design-audit.pdf "Pinnacle Labs"`

---

## Step 1: Detect File Type

Determine the import path based on the file extension:

- `.docx` -- use the DOCX Import Flow
- `.pdf` -- use the PDF Import Flow
- Any other extension -- show an error and stop:
  ```
  Unsupported file format: .{ext}
  Only .docx and .pdf files are supported.
  ```

Verify the file exists before proceeding. If it does not exist, show an error and stop.

---

## Step 2a: DOCX Import Flow

### Check Pandoc

Run `which pandoc` to verify Pandoc is installed. If not found, show:

```
Pandoc is required for .docx import but was not found.

Install it with:
  brew install pandoc

Then re-run the import.
```

Stop execution.

### Extract Content

Run Pandoc to convert the document to markdown:

```bash
pandoc "{input_path}" -t markdown --wrap=none
```

Capture the full stdout output as the extracted markdown content.

---

## Step 2b: PDF Import Flow

### Check PyMuPDF

Run `python3 -c "import fitz"` to verify PyMuPDF is available. If it fails, show:

```
PyMuPDF is required for .pdf import but was not found.

Install it with:
  pip3 install PyMuPDF

Then re-run the import.
```

Stop execution.

### Extract Content

Run a Python script to extract text from all pages:

```bash
python3 -c "
import fitz
import sys

doc = fitz.open(sys.argv[1])
text = ''
for page in doc:
    text += page.get_text()
print(text)
" "{input_path}"
```

Capture the full stdout output as the extracted text content.

---

## Step 3: Parse Extracted Content

Analyze the extracted content to identify:

- **Title** -- look for the first prominent heading, or a line containing "Proposal" / "Statement of Work" near the top
- **Sections** -- identify major section headings (Executive Summary, Scope, Timeline, Investment, etc.)
- **Pricing / Investment** -- look for dollar amounts, tables with pricing tiers, or lines containing "investment", "cost", "pricing", "budget"
- **Duration** -- look for references to weeks, months, timeline, or phases
- **Team size** -- look for references to developers, designers, team members
- **Technologies** -- look for technology names (React, Next.js, PostgreSQL, etc.)
- **Engagement type** -- infer from content keywords:
  - "greenfield", "new build", "from scratch" -> `greenfield-build`
  - "design system", "component library" -> `design-system`
  - "augmentation", "staff", "embedded" -> `team-augmentation`
  - "audit", "review", "assessment", "consulting" -> `audit-consulting`
  - "retainer", "maintenance", "support" -> `maintenance-retainer`
  - "migration", "upgrade", "rewrite" -> `migration`
  - "MVP", "prototype", "proof of concept" -> `mvp`

If a field cannot be reliably determined, leave it blank for the user to fill in during the confirmation step.

---

## Step 4: Create Proposal File

1. Generate a client slug: lowercase the client name, replace spaces and special characters with hyphens, remove consecutive hyphens
2. Use the provided date (or today if not provided), formatted as `YYYY-MM-DD`
3. Create the directory: `.mm/proposals/{date}-{client-slug}/`
4. Write `.mm/proposals/{date}-{client-slug}/proposal.md` with the following structure:

### YAML Frontmatter

```yaml
---
type: proposal
client: '{Client Name}'
title: '{Extracted or Inferred Title}'
prepared_by: 'TJ Pitre'
date: '{Month DD, YYYY}'
status: accepted
document_type: proposal
engagement_type: '{inferred engagement type or empty}'
investment_range: '{extracted investment range or empty}'
duration: '{extracted duration or empty}'
team_size: '{extracted team size or empty}'
technologies: [{ extracted technologies or empty list }]
---
```

**Notes on defaults:**

- `status` defaults to `accepted` for historical imports (the assumption is that imported past proposals were used)
- `prepared_by` defaults to "TJ Pitre"
- `document_type` defaults to `proposal` unless the content clearly indicates SOW, estimate, or change order

### Markdown Body

Restructure the extracted content into clean markdown:

- Use `##` headings for major sections
- Preserve the original section ordering and content
- Clean up formatting artifacts from the conversion (extra whitespace, broken tables, garbled characters)
- If the source had tables, reconstruct them as proper markdown tables
- Remove any headers/footers that appear on every page (common in PDF extraction)

---

## Step 5: Display Extracted Metadata for Review

After creating the file, display the extracted metadata and prompt the user to confirm or correct each field:

```
Proposal Imported

  file     .mm/proposals/{date}-{client-slug}/proposal.md
  source   {original file path}

Extracted Metadata (please confirm or correct):

  client            {Client Name}
  title             {Extracted Title}
  engagement_type   {inferred type or "unknown -- please specify"}
  investment_range  {extracted range or "not found -- please specify"}
  status            accepted
  date              {date}
  duration          {extracted or "not found"}
  team_size         {extracted or "not found"}
  technologies      {extracted list or "none detected"}

Would you like to correct any of these fields?
```

Wait for the user to confirm or provide corrections. If corrections are given, update the frontmatter in the proposal file.

---

## Step 6: Post-Import

After the user confirms the metadata:

1. Suggest rebuilding the proposals index:

   ```
   Run /mm:index-proposals to update the proposals index with this new entry.
   ```

2. Offer PDF export:
   ```
   To export this proposal as a branded PDF:
     /mm:export-proposal {date}-{client-slug}
   ```

---

## Privacy Reminders

When importing proposals that reference other clients:

- The imported content stays local in `.mm/proposals/` (gitignored)
- When this proposal is later used as a style reference for new proposals, client-specific details (names, scope, exact pricing) will be stripped
- Only structural patterns (tone, section ordering, formatting style) are extracted for reference

## Troubleshooting

- **Pandoc not found** -- `brew install pandoc`
- **PyMuPDF not found** -- `pip3 install PyMuPDF`
- **File not found** -- check the file path; use an absolute path if relative path fails
- **Garbled text from PDF** -- the PDF may be image-based (scanned). PyMuPDF extracts text layers only. For scanned PDFs, OCR is needed (out of scope)
- **Empty extraction** -- the file may be corrupted or password-protected. Try opening it manually first
- **Broken tables** -- Pandoc and PyMuPDF handle tables differently. Review the imported markdown and manually fix any table formatting issues

## Related Commands

- `/mm:index-proposals` -- Rebuild the proposals index dashboard
- `/mm:export-proposal` -- Export a proposal to branded PDF
- `/mm:proposal` -- Create a new proposal from the template
