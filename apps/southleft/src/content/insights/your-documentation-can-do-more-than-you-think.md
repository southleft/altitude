---
title: "Your Documentation Can Do More Than You Think"
date: 2025-09-08
category: "design-systems"
categoryName: "Design Systems"
excerpt: "Company Docs MCP turns your existing documentation into an intelligent assistant that can serve your team and even power AI to build and validate better products."
hero: "https://southleft.pages.dev/media/tpitre_An_absurd_corporate_office_scene_where_workers_are_swi_43f0342e-d373-419b-8ff2-74e19d2354ab_0.webp"
---

When most people think about documentation, they picture static files: a reference you have to dig through, usually when you’re already frustrated. Helpful, but not exactly inspiring.

But what if your documentation could be more than a reference? What if it could _actively_ help your team build better products and even fuel other AI tools to generate components, validate code, and surface best practices automatically?

That’s the promise of **[Company Docs MCP](https://github.com/southleft/company-docs-mcp)**.

It started as the [Design Systems Assistant MCP](https://github.com/southleft/design-systems-mcp), a project built to make best practices easier to find. But it’s evolved into something more: a reproducible, single-tenant assistant that any organization can spin up in minutes.

## Quick Video Demo

<figure class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio"><div class="wp-block-embed__wrapper"><iframe loading="lazy" title="Company Docs MCP: Transform Your Documentation Into an AI Assistant" width="500" height="375" src="https://www.youtube.com/embed/JsaT4kwEQn4?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe></div></figure>

## **Why We Built It**

Documentation is often scattered across repos, PDFs, and Confluence pages. Even when you know where to look, search usually returns too much noise and not enough signal. Onboarding slows down. Support tickets pile up. Consistency slips.

The idea behind Company Docs MCP is simple: instead of hunting for docs, your docs come to you. And not just to you, they’re made available to any MCP-enabled client or AI workflow you want to plug into.

## **How It Works**

At its core, Company Docs MCP is just a **server that speaks MCP**. That means it can plug into any MCP-enabled client, Claude Desktop, Claude Code, Cursor, and instantly make your documentation queryable in natural language.

Here’s what makes it powerful:

-   **Content ingestion that fits your org.** Markdown files, GitHub repos, PDFs, CSVs, or even live websites. If your docs exist, the MCP can pull them in.
-   **Semantic search, not keyword hunt.** Everything gets stored as embeddings in a vector database (Supabase + pgvector). Queries return results based on meaning, not just matching words.
-   **Edge deployment for speed.** Hosted on Cloudflare Workers, queries come back in under 50ms—globally. No cold starts, no idle servers.
-   **Multi-channel access.** Branded web chat UI, Slack integration (yep, you can /docs your way to answers), API endpoints, and MCP remotes that slot right into AI-powered tools.

## **Why This Matters**

This isn’t just a convenience upgrade. It’s a shift in how organizations work with knowledge.

-   **For contributors**: anyone can add content. Update the repo, re-run ingestion, and your knowledge base evolves.
-   **For consumers**: docs are finally where you need them—inside Slack, inside Claude, inside your workflows.
-   **For teams**: onboarding accelerates, support tickets drop, and consistency improves. Everyone pulls from the same trusted source.

And once the docs are in the system, they don’t just sit there waiting to be retrieved. They can fuel AI to do more: generate components, validate code against standards, create test cases, spin up Storybook stories, even inform PR reviews. Documentation goes from being static text to _active infrastructure_.

## **The Bigger Picture**

We started with design systems because the pain was obvious: teams constantly asking the same questions, struggling to align across Figma and code, missing accessibility guidelines. The Design Systems Assistant MCP gave them a baseline resource.

Company Docs MCP takes that foundation and makes it general. Now, any team, product, design, engineering, can spin up a single-tenant documentation assistant that reflects _their_ way of working.

And because it’s MCP-based, it’s not trapped in a silo. The same server that powers your Slack bot can also power your Claude Desktop setup, your custom web apps, or whatever AI flows you’re experimenting with.

## **Quick Start, No Redundancy**

One of the best parts? It’s **free and open source**. There’s a quick start guide that gets you up and running in 15 minutes.

And because it points directly to your existing documentation sources, there’s no redundancy. If you’re already using something like Docusaurus with Markdown files in a repo, you don’t need to copy them anywhere else. Just point Company Docs MCP at the repo and let it ingest from there.

## **Looking Ahead**

The potential here is wide open. Documentation could become:

-   **Proactive.** Surfacing the right guidance in a PR review before anyone even asks.
-   **Analytical.** Showing what teams are searching for most, and where the gaps are.
-   **Generative.** Creating new docs automatically from code changes or design updates.
-   **Cross-channel.** Integrated into tools like Figma, Jira, or VS Code without extra effort.

The sky really is the limit.

## **Closing**

Company Docs MCP is more than a documentation server. It’s a way to turn static text into living intelligence, available instantly, wherever your team works, and ready to power not just answers but action.

[Clone it](https://github.com/southleft/company-docs-mcp). Point it at your docs. And see what happens when your documentation starts building with you.
