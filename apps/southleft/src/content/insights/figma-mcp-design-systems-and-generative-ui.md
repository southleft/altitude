---
title: "Rethinking Design-to-Product Workflows with MCP, Design Systems, and Generative UI"
date: 2025-06-12
category: "design-systems"
categoryName: "Design Systems"
excerpt: "By combining Figma’s MCP server, a structured design system, and natural language UI generation, we’re not just speeding up design-to-dev, we’re rethinking the entire path from idea to product."
hero: "https://southleft.pages.dev/media/figma-mcp-ds-gen-ui.webp"
---

A few months ago, I [wrote about my experiences](/insights/design-systems/from-figma-to-front-end-using-ai-to-generate-real-code-in-seconds/) working with a community-contributed MCP server called [Figma Context MCP](https://github.com/GLips/Figma-Context-MCP). That alone felt like a shift.

Now, after testing [Figma’s official MCP server](https://www.figma.com/blog/introducing-figmas-dev-mode-mcp-server/) with [Cursor](https://www.cursor.so/) and our own [Altitude](/altitude/) design system, I’m even more convinced: something **big** is changing.

This post outlines why that matters and how combining MCP, structured design systems, and natural language-driven UI generators creates an entirely new workflow.

## The Problem with the Current Workflow

Even with mature design systems, the flow from design to code is often tedious. We still spend time translating component intent, matching tokens, questioning spacing, and second-guessing naming conventions. Developers are left interpreting visuals, and designers have little to no insight into what actually ships.

## What MCP Changes

[Figma’s Dev Mode MCP server](https://www.figma.com/blog/introducing-figmas-dev-mode-mcp-server/) introduces a structured, machine-readable layer of context that AI coding assistants can use to generate code. It reads from the actual design file, not a spec sheet or screenshot, and passes that context directly into your editor.

In my [first demo using the official MCP](https://www.linkedin.com/posts/tpitre_more-from-tj-plays-with-ai-design-systems-activity-7337890091056410626-7Zvt?utm_source=share&utm_medium=member_desktop&rcm=ACoAAAClzUMBPjPkKDE5pXFQhnfQPlrPXRWq9eU), I selected a component in Figma, dropped the URL into Cursor, and let it build a Web Component from our Altitude design system. The result:

-   Clean, readable code
-   Correct structure and component behavior
-   Styling that matched our other sibling components

It got about 95% of the way there. The only hiccup: a few inline CSS values could have been mapped to existing tokens. That may have stemmed from the Figma component using raw styles or misconfigured tokens, something I plan to investigate. But overall, it was remarkably close to production-ready.

## Why Design Systems Are the Real Enabler

MCP works best when there’s a well-structured design system behind it. In our case, Altitude uses a base of Web Components and a parallel React wrapper layer. Tokens are semantic and consistent, component variants are clearly named, and everything snaps into place predictably.

That structure is what allows AI tools to do something meaningful with the MCP data. Without it, you’re giving the assistant a map with no legend.

## A New Layer: Natural Language UI Configuration

In [Part 2 of the demo](https://www.linkedin.com/posts/tpitre_part-2-more-from-tj-plays-with-ai-design-activity-7338238326455341056-C_EC?utm_source=share&utm_medium=member_desktop&rcm=ACoAAAClzUMBPjPkKDE5pXFQhnfQPlrPXRWq9eU), I wrapped the generated component in React, dropped it into Storybook, and connected it to a custom tool I built called the Story UI Generator.

The Story UI Generator adds another layer: it lets product managers and designers configure layouts using plain language. Not through dropdowns or drag-and-drop, but via text prompts like:

> “Build a login form using the login card component and a button set.”

Or more detailed:

> “Create a 3×3 layout with three feature cards on top, a banner below them, and three CTA buttons at the bottom labeled 1, 2, and 3.”

The generator interprets these prompts and arranges the components accordingly. It does this by running a local MCP server that communicates with the developer’s text editor. That connection gives it awareness of the full component directory, the documentation, the tokens in use, and even the styling conventions applied across the system.

It’s like having a layout assistant that knows how your entire design system works and can instantly generate composable UI previews from intent.

## This Isn’t About Replacing Roles

This approach doesn’t eliminate the need for engineers. Instead, it creates space:

-   Engineers can focus on performance, logic, and architecture
-   Designers and PMs can test ideas faster, with higher fidelity
-   The system becomes a shared language, not a handoff document

Design systems shift from being libraries to becoming interactive platforms. Prompting becomes a new kind of interface between team members.

## Where I’m Focused Now

This approach definitely isn’t for everyone… yet. What I’m sharing is primarily geared toward orgs with dedicated digital teams who are already deep in the design systems and front-end space.

That said, one of my longer-term goals is to help make this entire process more approachable. Not just for internal product teams, but for smaller orgs and agencies too. Right now, I’m sharing what’s working in environments where we’re already set up to move fast. But once things feel more stable and repeatable, I’d love to collaborate with others to make this whole flow less intimidating and more accessible.

## Final Thoughts

The combination of MCP, structured design systems, and natural language UI generation isn’t a futuristic pipe dream. It’s here, right now, for teams with the right infrastructure and mindset.

This is more than just accelerating dev time. It’s about rethinking how products are built and who gets to build them.

If you’re experimenting in this space or curious about how to bring this to your team, I’d love to connect.
