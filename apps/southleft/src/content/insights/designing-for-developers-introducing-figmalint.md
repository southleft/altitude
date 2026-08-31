---
title: "Designing for Developers—and the AI Agents Working Beside Them"
date: 2025-07-02
category: "design-systems"
categoryName: "Design Systems"
excerpt: "How FigmaLint helps bridge the gap between design, development, and the AI agents transforming the product lifecycle."
hero: "https://southleft.pages.dev/media/figmalint-feature-image-wp.webp"
---

Design and development teams have long aimed for alignment. But in recent years, we’ve entered a new phase of product building, one that introduces not just tighter collaboration between humans, but agents, automation, and AI-led workflows.

This shift demands more from our systems. It’s no longer enough to hand off pretty designs and expect clean code. If our components are to be used by both developers and agents, they must be robust, structured, and self-describing.

That’s why I created **[FigmaLint](https://www.figma.com/community/plugin/1521241390290871981/figmalint)**.

It’s a plugin built to help designers structure their components with the same level of care and scrutiny that developers apply to code, so we can meet AI and engineering needs halfway. It helps surface gaps in component metadata, structure, tokens, and accessibility. And it offers recommendations based on your selected component’s type, so even designers unfamiliar with developer concerns can learn as they go.

## **From Inspiration to Action**

This tool wasn’t built overnight. It’s the culmination of a journey, one marked by pain points in handoffs, experimentation with the [Figma MCP](https://www.figma.com/blog/introducing-figmas-dev-mode-mcp-server/), and a desire to make design systems more accessible and reliable.

-   [Early demo post on LinkedIn](https://www.linkedin.com/posts/tpitre_figma-designsystems-frontend-activity-7343316073657602049-a6ds)
-   [Announcing our custom Design Systems MCP](https://www.linkedin.com/posts/tpitre_there-wasnt-a-trusted-mcp-server-for-design-activity-7344372065841401857-tr05)
-   [Breaking down Figma’s MCP and Generative UI](/insights/design-systems/figma-mcp-design-systems-and-generative-ui/)

These articles tell the story of how our process evolved. If you’ve been following along, FigmaLint is the natural next step.

## **Meeting in the Middle: Designers + Developers + Agents**

At Southleft, we’ve seen firsthand how easily alignment can break down, especially when a component _looks_ finished but doesn’t behave like it’s meant for production.

Designers believe they’re handing off a polished system. Developers assume it’s production-ready. The friction lives in the space between those assumptions.

This isn’t about pointing fingers. It’s about visibility.

Without a shared way to check structure, props, tokens, and naming conventions early in the process, both sides end up patching things too late, after code has already been written or rewritten.

**FigmaLint is a conversation starter.**

It helps designers spot gaps that usually only get caught in development.

And it gives developers more confidence that what they’re inheriting is built with implementation in mind.

It doesn’t judge. It supports.

It helps both sides meet in the middle, before things fall apart downstream.

It audits token usage, checks for missing or unclear properties, and offers thoughtful recommendations—often surfacing things only a dev would flag.

-   It helps designers think like developers.
-   It helps developers breathe a little easier.
-   And it helps agents interpret the component cleanly so the downstream code generation process runs smoothly.

<figure class="wp-block-image size-full"><img loading="lazy" decoding="async" width="1880" height="1024" src="https://southleft.pages.dev/media/Screenshot-2025-07-01-at-10.01.18-PM.webp" alt="FigmaLint detecting hard-coded values. " class="wp-image-2995" srcset="https://southleft.pages.dev/media/Screenshot-2025-07-01-at-10.01.18-PM.webp 1880w, /media/Screenshot-2025-07-01-at-10.01.18-PM.webp 800w, /media/Screenshot-2025-07-01-at-10.01.18-PM.webp 1400w, /media/Screenshot-2025-07-01-at-10.01.18-PM.webp 768w, /media/Screenshot-2025-07-01-at-10.01.18-PM.webp 1536w" sizes="auto, (max-width: 1880px) 100vw, 1880px"><figcaption class="wp-element-caption">When components use hard-coded values instead of design tokens, FigmaLint flags them and shows you exactly where they live across variants. No more pixel hunting.</figcaption></figure>

## **Building for AI, Not Just for Humans**

A shift is happening in design tooling. It’s no longer just about collaborating better—it’s about designing for a new kind of audience: **AI agents**.

With systems like the Figma MCP, we’re designing for intelligent interpreters that turn design into structured, reusable code. They don’t assume. They don’t guess.

If your component is incomplete, an agent will:

-   Rebuild what’s missing
-   Flatten structure
-   Default to explicit values instead of tokens
-   Miss the nuance of your design intent entirely

This is where FigmaLint becomes more than a QA tool.

It’s a translator, making sure the language of your design is legible to the systems that now carry it forward.

Designing for AI doesn’t replace human craft.

It amplifies it, if the inputs are right.

<figure class="wp-block-image size-full"><img loading="lazy" decoding="async" width="1881" height="1023" src="https://southleft.pages.dev/media/Screenshot-2025-07-01-at-10.01.59-PM.webp" alt="FigmaLint's built-in chat capabilities. " class="wp-image-2993" style="object-fit:cover" srcset="https://southleft.pages.dev/media/Screenshot-2025-07-01-at-10.01.59-PM.webp 1881w, /media/Screenshot-2025-07-01-at-10.01.59-PM.webp 800w, /media/Screenshot-2025-07-01-at-10.01.59-PM.webp 1400w, /media/Screenshot-2025-07-01-at-10.01.59-PM.webp 768w, /media/Screenshot-2025-07-01-at-10.01.59-PM.webp 1536w" sizes="auto, (max-width: 1881px) 100vw, 1881px"><figcaption class="wp-element-caption">FigmaLint’s built-in chat understands your selected component and provides tailored advice, helping designers think like developers without needing to be one.</figcaption></figure>

## **Your Own AI-Aware Design Systems MCP**

To ensure FigmaLint’s recommendations are solid, we built our own internal [Design Systems MCP](https://github.com/southleft/design-systems-mcp), a curated, centralized knowledge base of token standards, component behaviors, and naming conventions based on the real-world design systems we’ve worked on.

This MCP helps power:

-   Accurate suggestions for property naming
-   Contextual guidance based on component type
-   Validated best practices around structure and token use

It’s what helps FigmaLint act less like a checklist, more like a partner.

## **From Design to Development to Delivery**

Here’s what a modern, AI-powered product development cycle can look like:

1.  **Designers** create system-based components with variants, states, tokens, etc.
2.  **FigmaLint** audits those components, scores them, and offers recommendations
3.  **Figma MCP** bridges design and code, allowing tools like Claude, Cursor, or Windsurf to read and interpret components with high accuracy
4.  **Developers** validate the generated code, then finalize, test, and publish
5.  **[StoryUI](https://www.linkedin.com/posts/tpitre_designsystems-ai-activity-7341411937311735808-Lk23?utm_source=share&utm_medium=member_desktop&rcm=ACoAAAClzUMBPjPkKDE5pXFQhnfQPlrPXRWq9eU)** – a generative layout tool built by Southleft, uses these components to iterate over full-page designs in seconds

These tools together enable teams to move faster without compromising quality. They reduce friction, eliminate guesswork, and support design and development in equal measure.

And it all starts with properly structured components.

Curious what this looks like in action? [Watch the demo](https://www.youtube.com/watch?v=7bIIxvnvEzI&t=8s) to see how FigmaLint analyzes components, flags issues, and recommends improvements in real time.

<figure class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio"><div class="wp-block-embed__wrapper"><iframe loading="lazy" title="FigmaLint Demo – Audit, Score, and Improve Your Figma Components for AI and Dev Readiness" width="500" height="281" src="https://www.youtube.com/embed/7bIIxvnvEzI?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe></div></figure>

## **Who This Is For**

FigmaLint was built for:

-   Designers who want to level up their systems thinking
-   Developers who want to stop fixing design gaps
-   Systems teams who want a better feedback loop  
    Product teams who care about speed without compromising accuracy

It’s also for those building **the next generation of digital products**, where AI plays a central role in bridging human creativity with scalable implementation.

FigmaLint is currently in beta and [**available now in the Figma Community**](https://www.figma.com/community/plugin/1521241390290871981/figmalint). I’m incredibly proud of what it can already do and even more excited about where it’s headed. If you’re using MCP or building design systems in Figma, I’d love for you to try it out and share feedback.

## **Want to Chat?**

If you’re exploring ways to modernize your product development lifecycle, or if you’re just curious how AI and design systems can work better together, we’re here.

We’ve helped teams audit their systems, augment their workflows, and set up tools/services like FigmaLint to make real impact.

If you’re curious how this could work for your team, [let’s talk](/contact/)!
