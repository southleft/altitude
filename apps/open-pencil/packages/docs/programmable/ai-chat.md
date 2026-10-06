---
title: AI Chat
description: Connect your own AI agent to OpenPencil over MCP; the built-in chat panel is not available in this distribution.
---

# AI Chat

::: warning Not available in this distribution
The built-in AI chat panel, its <kbd>⌘</kbd><kbd>J</kbd> shortcut, and the **AI & agents** and **Usage** settings are not included in this distribution. Connect an agent you already use, such as Claude Code, Claude Desktop, or Cursor, through the [MCP server](./mcp-server) instead. The **Connect AI** button at the top of the right panel shows the setup steps; see [Connect AI](./mcp-server#connect-ai).
:::

Agents connected over MCP use your own subscription, so OpenPencil needs no provider API keys. They work on the document open in the desktop app.

## What It Can Do

The tool catalog covers these categories; the tools offered to an agent depend on **Settings → Tool access**:

- **Create** — frames, shapes, text, components, pages. Renders JSX for complex layouts.
- **Style** — fills, strokes, effects, opacity, corner radius, blend modes.
- **Layout** — auto-layout, grid, alignment, spacing, sizing.
- **Components** — create components, instances, component sets. Manage overrides.
- **Variables** — create/edit variables, collections, modes. Bind to fills.
- **Query** — find nodes, XPath selectors, read properties, list pages, fonts, selection.
- **Inspect** — `get_jsx` for JSX roundtrip view, `diff_jsx` for structural diffs, `describe` for semantic role and design issue detection.
- **Analyze** — color palette, typography audit, spacing consistency, cluster detection.
- **Export** — PNG, SVG, JSX with Tailwind classes. Vision-based verification via `export_image`.
- **Vector** — boolean operations, path manipulation.

## Visual Verification

An agent can verify its work visually. When `export_image` is enabled, it can capture a screenshot after creating or modifying designs and check the result against the original request. This catches layout issues, missing elements, and color mismatches that text-only responses would miss.

## Example Prompts

- "Create a card with a title, description, and a blue button"
- "Make all buttons on this page use the same border radius"
- "What fonts are used in this file?"
- "Change the background of the selected frame to a gradient from blue to purple"
- "Export the selected frame as SVG"
- "Find all text nodes with font size less than 12"
- "Describe the selected component — what role does it look like?"
- "Show me the JSX for this frame"

## Tips

- Select nodes before asking — agents can read the current selection.
- Be specific about colors, sizes, and positions for precise results.
- An agent can modify multiple nodes in one request.
- Use "undo" in the editor if you don't like the result — AI mutations support full undo.
- All layout is recomputed automatically after each tool execution.
