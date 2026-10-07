---
title: Layers & Pages
description: Managing layers, pages, and the properties panel in OpenPencil.
---

# Layers & Pages

The editor interface has three main panels: layers (left), canvas (center), and properties (right). All panels are resizable by dragging the dividers.
## Layers Panel

The layers panel on the left displays the document hierarchy as a tree.

### Tree View

Nodes are shown in a collapsible tree. Click the chevron next to a frame, group, or component to expand or collapse its children.

### Drag Reorder

Drag layers to reorder them. Nodes higher in the list render on top.

### Visibility Toggle

Click the eye icon next to any layer to hide or show it on the canvas. Hidden nodes remain in the tree.

### Rename

Double-click a layer name to rename it inline. Press <kbd>Enter</kbd> or click away to commit, <kbd>Escape</kbd> to cancel.

### Selection Sync

Clicking a layer in the panel selects the corresponding node on the canvas, and vice versa.

## Pages Panel

The pages panel shows all pages in the document.

- **Switch page** — click a page tab to make it active. The canvas switches to that page and restores its viewport position.
- **Add page** — click the add button to create a new page
- **Delete page** — remove the current page
- **Rename page** — double-click the page name for inline editing. Pressing <kbd>Enter</kbd> or <kbd>Escape</kbd>, or clicking away, commits the rename.

Each page has its own canvas and viewport state.

## Documents and Recovery

The Home workspace lists recent local documents and documents from configured storage providers. Use grid or list view, or open multiple selected files into separate editor tabs.

In **Settings → General → Recovery**, **Automatically preserve unsaved work** controls local recovery copies. With recovery enabled, unsaved changes remain recoverable until they are saved, including changes to documents opened from a file or a storage provider, and even after their tabs close. A restored document opens as an unsaved copy; use **Save As** to replace the original file. When OpenPencil offers **Recover unsaved work**, choose **Restore** to reopen a document or **Discard** to remove its recovery copy.

Disabling recovery stops automatic preservation and removes recovery copies owned by currently open documents. It does not bulk-delete snapshots from previously closed documents. Recovery is local to this installation/browser profile; it is not a replacement for saving a file, cloud synchronization, or a backup.

## Properties Panel

The properties panel on the right has three tabs: **Design**, **Variables**, and **Code**. The top of the panel also holds the collaboration control and the **Connect AI** button.

### Design Tab

Shows the properties of the selected node(s), organized in sections:

- **Appearance** — opacity, corner radius (with independent corner toggle), visibility
- **Fill** — solid color, gradients (linear, radial, angular, diamond), image fills, variable bindings
- **Stroke** — color, width, cap, join, dash pattern
- **Effects** — drop shadow, inner shadow, layer blur, background blur, foreground blur
- **Typography** — font family, size, weight, B/I/U/S formatting buttons (visible for text nodes)
- **Layout** — [auto layout](./auto-layout) controls (visible for auto-layout frames)
- **Export** — scale, format, and export button (see [Exporting](./exporting))

When no nodes are selected, the Design tab shows page-level properties including the canvas background color.

### Variables Tab

Shows variable and collection counts, a mode picker for each collection with more than one mode, and an **Import tokens…** button. The settings icon opens the full variables dialog. See [Variables](./variables).

### Code Tab

Displays the selection as code with syntax highlighting, line numbers, and a copy button. A source selector switches between three modes:

- **Design JSX** — OpenPencil component tree compatible with `renderJSX()` for programmatic round-trip; editable
- **Tailwind JSX** — HTML with Tailwind v4 utility classes (`<div className="flex gap-4 p-3">`) ready to paste into React/Vue projects; read-only
- **HTML/CSS** — HTML with a stylesheet; editable

All three modes follow the current canvas selection. With nothing selected, the panel shows a starter snippet.

### Connect AI

The **Connect AI** button opens a popover with setup steps for connecting Claude Code, Claude Desktop, Cursor, or another MCP client to OpenPencil through the local MCP server. When an agent has recently sent a request, the button reads **AI connected**. See [MCP Server](../programmable/mcp-server#connect-ai).

## Mobile Layout

On mobile and small screens, the side panels are replaced by a swipeable bottom drawer. Tabs at the top of the drawer switch between Layers, Design, Variables, and Code views. The toolbar collapses to a compact horizontal strip with category switching.

## Tips

- Panel widths are saved automatically — they persist across reloads.
- Use the layers panel to find overlapping nodes that are hard to click on the canvas.
- The [context menu](./context-menu) provides additional actions for selected nodes.
- See [Selection & Manipulation](./selection-and-manipulation) for z-order shortcuts (]/[) and visibility/lock toggles.
