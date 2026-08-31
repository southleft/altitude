---
title: "What Happens When AI Actually Understands Your Design System"
date: 2025-07-24
category: "design-systems"
categoryName: "Design Systems"
excerpt: "A quick demo showing how Claude, the Figma MCP, and the Design Systems Assistant MCP work together to deliver smarter, context-aware design system support."
hero: "https://southleft.pages.dev/media/AI-understanding-design-systems-with-MCP.webp"
---

When I first launched the [**Design Systems Assistant MCP**](https://www.linkedin.com/posts/tpitre_there-wasnt-a-trusted-mcp-server-for-design-activity-7344372065841401857-tr05), I was just trying to solve a problem I ran into while building FigmaLint: how do you get AI to reason reliably about design systems?

General prompts gave me inconsistent results. I’d ask the same question about a button component three times and get three slightly different answers. Sometimes helpful, sometimes totally off. Close, but not close enough for enterprise teams relying on precision to support their design-dev workflows.

So I built a solution: an MCP server (Model Context Protocol) trained on over 100 authoritative sources, purpose-built to help AI understand design systems from strategy to tokens to implementation. I also made it open source so anyone could use it with their own tools.

## **The Real Power of an MCP**

If you’re not familiar with MCPs, they’re essentially structured knowledge bases that AI models can reference in real time, kind of like giving an assistant your company’s wiki before asking it for advice.

The Design Systems Assistant MCP makes that idea specific to design systems:

-   component props and states
-   naming conventions
-   accessibility standards
-   documentation best practices
-   governance models
-   token architecture
-   and more

But here’s where it gets interesting…

## **Claude + Figma MCP + Design Systems Assistant MCP**

What happens when you combine:

1.  **Claude’s general reasoning ability**
2.  A **Figma MCP** tied to your actual design system (in my case, Altitude)
3.  The **Design Systems Assistant MCP** that layers in best practices?

You get an assistant that doesn’t just _sound_ confident, it _is_ confident, because it’s grounded in the actual structure, constraints, and conventions of your system.

Instead of asking:

> “What props should a button have?”

…and getting generic responses like onClick, disabled, or variant, you can ask:

> “What props does this button have in my design system, and are there any we’re missing based on best practices?”

And get a scoped, context-rich answer backed by real Figma data _and_ community standards.

<figure class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio"><div class="wp-block-embed__wrapper"><iframe loading="lazy" title="Using AI to Supercharge Design Systems with Claude and Custom MCPs" width="500" height="281" src="https://www.youtube.com/embed/QIq7OM0oc6Y?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe></div></figure>

[This walkthrough](https://youtu.be/QIq7OM0oc6Y) shows exactly how Claude’s responses evolve as more context is added, from general model knowledge to Figma-level context to full-blown design systems reasoning.

## **Why This Matters**

If you’re relying on AI tools in your design systems workflow (and let’s be honest, most of us are starting to), the difference between general-purpose responses and scoped, structured insights is massive.

Scoped context reduces hallucination.

It improves clarity.

And it builds trust, especially for dev teams, systems leads, and product orgs that need consistent guidance.

It’s also the foundation for what’s coming next:

-   a more interactive FigmaLint
-   smarter auditing in DS Audit
-   more advanced workflows across design and engineering

## **Try It or Build on It**

The Design Systems Assistant MCP is free and open source:

-   💬 Try the chat: [https://design-systems-mcp.southleft.com](https://design-systems-mcp.southleft.com)
-   📁 Explore the repo: [https://github.com/southleft/design-systems-mcp](https://github.com/southleft/design-systems-mcp)

You can use it in Claude, Cursor, your own plugins/apps, etc, anything that supports MCP inputs.

If you’re building tools for teams working with design systems, I hope this becomes a helpful foundation or, at the very least, a step toward more thoughtful AI integration.
