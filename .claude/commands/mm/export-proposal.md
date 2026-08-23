# Export Document to PDF (Monday Morning)

Export a markdown document (proposal, SOW, estimate, or change order) to a branded PDF using Typst.

## Usage

```
/mm:export-proposal [proposal-folder] [filename]
```

**Examples:**

- `/mm:export-proposal 2026-03-17-eagle-industries` — export from folder (auto-detects document)
- `/mm:export-proposal 2026-03-17-eagle-industries sow.md` — export specific file
- `/mm:export-proposal` — interactive, lists available folders and documents to pick from

---

## Prerequisites

Both Typst and Pandoc must be installed:

```bash
brew install typst pandoc
```

If either is missing, show the install command and stop.

## Supported Document Types

The document type is determined by the `type` field in the YAML frontmatter of the source markdown file.

| Frontmatter `type` | Title-Block Label |
| ------------------ | ----------------- |
| `proposal`         | Proposal          |
| `sow`              | Statement of Work |
| `estimate`         | Estimate          |
| `change-order`     | Change Order      |

## Locate Document

**If a folder name is provided:**

1. Look in `.mm/proposals/{folder}/` for all `.md` files
2. For each `.md` file found, read its YAML frontmatter and check for a `type` field matching a known type (`proposal`, `sow`, `estimate`, `change-order`)
3. If a specific filename is also provided as a second argument, use that file directly
4. If exactly one document with a known type is found, use it
5. If multiple documents with known types exist, list them and ask the user to pick one:

   ```
   Multiple documents found in {folder}:

     1. proposal.md  — Proposal: "Website Analytics Platform"
     2. sow.md       — Statement of Work: "Website Analytics Platform"

   Which document to export? (1-2)
   ```

6. If no documents with a known type are found, show an error

**If no argument:**

1. List all folders in `.mm/proposals/`
2. For each folder, scan for `.md` files with a known `type` in frontmatter
3. Show each folder with its documents, titles, and types
4. Ask the user to pick a folder, then a document if multiple exist

## Read Frontmatter Fields

From the selected document's YAML frontmatter, read:

- **`type`** — determines the title-block label (see table above)
- **`title`** — document title for the title block
- **`client`** — client name for the title block
- **`prepared_by`** (or `prepared-by`) — author name for the title block
- **`date`** — date string for the title block header

## Export Process

Let `{source}` be the source filename (e.g., `sow.md`) and `{stem}` be the filename without extension (e.g., `sow`).

1. Read the document markdown from `.mm/proposals/{folder}/{source}`
2. Convert markdown to Typst format using Pandoc. Run from the proposal directory:
   ```bash
   cd .mm/proposals/{folder}
   pandoc {source} -f markdown -t typst -o {stem}-content.typ
   ```
3. Determine the title-block label from the `type` frontmatter field using the mapping table above.
4. Create the final `.typ` file (`{stem}-styled.typ`) by prepending the style imports and title block:

   ```typst
   #import "../../templates/proposal/style.typ": template, horizontalrule
   #show: template

   // ... paste {stem}-content.typ contents here ...
   ```

   **Important:** Must import both `template` AND `horizontalrule` -- Pandoc emits `#horizontalrule` for markdown `---` separators.

   When building the `title-block` call in the Typst wrapper, use the detected type's label. For example, if the type is `sow`, the label parameter should be `"Statement of Work"`. Use the frontmatter `title`, `client`, `prepared_by`/`prepared-by`, and `date` values in the title block as well.

5. Fix known Pandoc table conversion issues: if the generated Typst has mangled `#figure(align(center)[#table(...)])` blocks, replace them with clean `#table(...)` blocks. Pandoc sometimes garbles multi-row markdown tables.
6. Compile to PDF from the proposal directory:
   ```bash
   typst compile {stem}-styled.typ {stem}.pdf \
     --root /path/to/project/.mm \
     --font-path /path/to/project/.mm/templates/proposal/assets/fonts/
   ```
   **Critical:** The `--root` flag MUST point to the `.mm/` directory. Without it, Typst cannot access the style template or assets (it sandboxes file access to the project root).
7. Clean up intermediate files (`{stem}-content.typ`, `{stem}-styled.typ`) -- optional, keep if user wants to inspect.

## Output

The PDF is saved to `.mm/proposals/{folder}/{stem}.pdf`

The output filename matches the source filename: `proposal.md` produces `proposal.pdf`, `sow.md` produces `sow.pdf`, `estimate.md` produces `estimate.pdf`, `change-order.md` produces `change-order.pdf`.

## Confirm Export

```
Document Exported

  type     {Type Label}
  source   .mm/proposals/{folder}/{source}
  output   .mm/proposals/{folder}/{stem}.pdf

Open the PDF:
  open .mm/proposals/{folder}/{stem}.pdf
```

## Troubleshooting

- **Typst not found** -- `brew install typst`
- **Pandoc not found** -- `brew install pandoc`
- **"access denied" / "cannot read file outside of project root"** -- add `--root /path/to/.mm` to the typst compile command
- **"unknown variable: horizontalrule"** -- make sure the import line includes `horizontalrule`: `#import "...style.typ": template, horizontalrule`
- **"maximum show rule depth exceeded"** -- the style.typ has a recursive show rule; check that `show line:` is not present in style.typ
- **Font not found warning** -- check that `.mm/templates/proposal/assets/fonts/` contains the .ttf files
- **Image not found** -- check that `.mm/templates/proposal/assets/header.png` and `footer.png` exist
- **No known document type found** -- ensure the `.md` file has a YAML frontmatter block with `type: proposal`, `type: sow`, `type: estimate`, or `type: change-order`

## Related Commands

- `/mm:proposal` -- Create a new proposal from the template
- `/mm:doc-scaffold sow` -- Create a new Statement of Work from the template
- `/mm:doc-scaffold estimate` -- Create a new Estimate from the template
- `/mm:doc-scaffold change-order` -- Create a new Change Order from the template
