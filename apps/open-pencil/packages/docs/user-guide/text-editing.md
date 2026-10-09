---
title: Text Editing
description: Creating and editing text with rich formatting, fonts, and inline editing in OpenPencil.
---

# Text Editing

Create text nodes and edit them directly on the canvas with full rich text support.
## Creating Text

Press <kbd>T</kbd> to activate the text tool, then click on the canvas. An empty text node appears with a blinking cursor — start typing immediately.

## Inline Editing

Double-click any existing text node to enter inline editing mode. A blue outline appears around the text to indicate edit mode. Click outside the text node to commit and exit editing.

Text is rendered directly on the canvas — there's no separate text input overlay.

## Cursor Navigation

| Action | Mac | Windows / Linux |
|--------|-----|-----------------|
| Move left/right | <kbd>←</kbd> / <kbd>→</kbd> | <kbd>←</kbd> / <kbd>→</kbd> |
| Move up/down | <kbd>↑</kbd> / <kbd>↓</kbd> | <kbd>↑</kbd> / <kbd>↓</kbd> |
| Move by word | <kbd>⌥</kbd><kbd>←</kbd> / <kbd>⌥</kbd><kbd>→</kbd> | <kbd>Ctrl</kbd> + <kbd>←</kbd> / <kbd>Ctrl</kbd> + <kbd>→</kbd> |
| Move to line start/end | <kbd>⌘</kbd><kbd>←</kbd> / <kbd>⌘</kbd><kbd>→</kbd> | <kbd>Home</kbd> / <kbd>End</kbd> |

Hold <kbd>Shift</kbd> with any movement key to extend the selection.

## Text Selection

- **Click** inside a text node to position the cursor
- **Click + drag** to select a range of text
- **Double-click** a word to select it
- **Triple-click** to select all text in the node

## Rich Text Formatting

Apply formatting to selected text, or toggle the style for the entire node when nothing is selected.

| Action | Mac | Windows / Linux |
|--------|-----|-----------------|
| Bold | <kbd>⌘</kbd><kbd>B</kbd> | <kbd>Ctrl</kbd> + <kbd>B</kbd> |
| Italic | <kbd>⌘</kbd><kbd>I</kbd> | <kbd>Ctrl</kbd> + <kbd>I</kbd> |
| Underline | <kbd>⌘</kbd><kbd>U</kbd> | <kbd>Ctrl</kbd> + <kbd>U</kbd> |

Strikethrough is available via the **S** toggle button in the Typography section of the properties panel (no keyboard shortcut — <kbd>⌘</kbd><kbd>S</kbd> is used for Save).

Formatting is applied per character. When you type between a bold and regular segment, the new text inherits the style of the preceding segment.

The **B / I / U / S** toggle buttons in the Typography section of the properties panel also apply formatting.

## Editing Operations

| Action | Mac | Windows / Linux |
|--------|-----|-----------------|
| Delete word before cursor | <kbd>⌥</kbd><kbd>⌫</kbd> | <kbd>Ctrl</kbd> + <kbd>Backspace</kbd> |
| Delete to line start | <kbd>⌘</kbd><kbd>⌫</kbd> | — |
| Cut | <kbd>⌘</kbd><kbd>X</kbd> | <kbd>Ctrl</kbd> + <kbd>X</kbd> |
| Copy | <kbd>⌘</kbd><kbd>C</kbd> | <kbd>Ctrl</kbd> + <kbd>C</kbd> |
| Paste | <kbd>⌘</kbd><kbd>V</kbd> | <kbd>Ctrl</kbd> + <kbd>V</kbd> |

## Font Picker

Open the font picker in the Typography section of the properties panel to change the font family. The picker features:

- **Search filter** — type to narrow the font list
- **Font preview** — each font name is rendered in its own typeface
- **Virtual scroll** — handles large font lists efficiently
- **Scroll-to-current** — the current font is highlighted when the picker opens

## Text on a Path

Imported Figma text-on-path layers retain their curved glyph layout. You can edit their text and typography, resize and select them, and save or export the result while preserving the path layout. This is support for existing imported path-text layers, not a separate drawing tool for attaching arbitrary text to a new path.

## Font Weight

Change the font weight in the Typography section of the properties panel. Available weights depend on the selected font family (e.g., Regular, Medium, Bold, Black).

## Font Sources

- **Default font** — Inter is loaded automatically
- **Desktop app** — system fonts plus enabled Google Fonts, Fontsource, Bunny Fonts, and Fontshare catalogs
- **Browser** — system fonts are available in Chrome and Edge with local-font permission. Enabled Fontsource, Bunny Fonts, and Fontshare providers can load online fonts, subject to network access and browser CORS rules; Google Fonts is disabled in the OpenPencil browser app
- **Downloaded fonts** — the desktop app caches downloaded faces for reuse on the same machine
- **Team fonts** — font files committed to `fonts/` in the version-control repository, available to everyone signed in to GitHub (see [Team fonts](#team-fonts))

Fonts resolve in this order: installed (system or local) fonts, the bundled Inter, team fonts, downloaded fonts, then online providers.

## Team Fonts

Commit `.woff2`, `.woff`, `.ttf` or `.otf` files to `fonts/` in the repository configured under **Settings → Version control** (for example `southleft/altitude-designs`). When you are signed in to GitHub, the font picker lists them first under **Team fonts · altitude-designs** (the repository name) and text using them renders without anyone installing the font.

- OpenPencil reads family and style from each file's name table. To name faces explicitly, or to record licence notes, add `fonts/fonts.json`:

  ```json
  {
    "fonts": [
      { "family": "Agrandir", "weight": 700, "file": "Agrandir-Bold.otf", "license": "Desktop + web licence" },
      { "family": "Agrandir", "style": "Medium Italic", "file": "Agrandir-MediumItalic.otf" }
    ]
  }
  ```

  `style` defaults from `weight` and `italic`; `weight` defaults from `style`. WOFF2 files without a manifest entry are named from their file name (`Agrandir-Bold.woff2` → Agrandir Bold).
- Files are downloaded through the GitHub API with your sign-in, checked (20 MB limit, font signature, Git blob hash) and cached in the browser by content hash, so reopening a document is offline-fast. A new commit of a file is fetched once.
- Variable fonts and font collections (`.ttc`) are not used; commit static instances.
- Only commit fonts whose licence allows sharing them with everyone who can read the repository.

## Missing Fonts and Substitutions

When a requested family or style cannot be loaded, OpenPencil displays a warning above the editor instead of silently treating fallback rendering as faithful typography.

Expand the warning to see every affected face and its active substitute. Use **Select layers** to locate all affected text nodes or **Retry fonts** after changing network access, local-font permission, or provider settings. A style may be synthesized from another loaded face in the same family; a missing family falls back to Inter when available.

### Fonts report

Choose **Review fonts** in the warning, or the warning icon next to the font picker, to open the document's font report. It lists every family and style the document uses, where each one resolved from (Bundled, Local, Team, Web, Fallback, Substituted or Missing), how many layers use it, and whether it belongs to the design system's typography. For Altitude, sanctioned families come from the document's imported `font-family` variables, or from Altitude's built-in typography list when none are imported.

- **Show layers** selects the layers using a family or style and zooms to them, switching pages when needed.
- **Replace…** swaps a family for another in every editable text layer, including style runs and text style definitions, as one undoable action. Suggestions list sanctioned families first, then similar names in the same category (sans, serif, mono, display). Choose a style, or keep each layer's weight and slant.
- A missing family shows where to add it: commit the files to the repository's `fonts/` folder, licence permitting, and everyone gets it on the next load.

The report covers the pages loaded in this session; very large imported files load pages as you open them.

## Tips

- The font list is preloaded at startup so the picker opens without delay.
- IME input (Chinese, Japanese, Korean) is fully supported.
- Rich text formatting is preserved when opening and saving .fig files.
- See [Components](./components) for how text overrides work in component instances.
