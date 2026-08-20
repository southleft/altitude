---
title: "Designers, You’re Not at the Kids’ Table Anymore"
date: 2026-03-30
category: "design-systems"
categoryName: "Design Systems"
excerpt: "There’s never been a better time for designers to ship real code, and you don’t need to “learn to code” to do it."
hero: "https://southleft.pages.dev/media/tpitre_Isometric_illustration_of_two_hands_reaching_toward_ea_5a30ee45-9681-48dc-be16-31b72aa216e0_2.webp"
---

For as long as design systems have existed, there’s been an unspoken hierarchy. Designers create the vision. Developers build the thing. And somewhere in between, intent gets lost, micro-interactions get flattened, easing curves get approximated, spacing gets “close enough.” The designer’s work becomes a depiction of the real thing, not the real thing itself.

That hierarchy is dissolving. Right now. Not in some future product roadmap or beta release. Today.

## The depiction problem

Every component in Figma is an avatar. It’s a representation of the thing that users actually interact with in an application. Designers pour conceptual thinking, interaction logic, accessibility considerations, and visual precision into these components, and then hand them off. From that point forward, they’re spectators.

The developer interprets. The developer prioritizes. And inevitably, the developer makes tradeoffs that the designer never agreed to, often because they’re focused on the architecture, the business logic, the parts of the stack that sit further from the surface. They’re not ignoring the details. They’re just solving different problems.

This isn’t a criticism of developers. It’s a structural issue. The people who care most about the craft of the interface have historically had no access to the medium where that craft actually lives.

## What changed

Three things converged that make this moment different from every previous “designers should code” conversation.

First, AI-powered development environments like Cursor, Claude Code, and others have made it possible to work in a codebase without needing to understand every line. A designer can describe intent and get working code. They can iterate visually. They can ask questions of the code itself.

Second, Model Context Protocol (MCP) servers have created a bridge between design tools and AI. Figma’s native MCP, custom implementations like [Figma Console MCP](https://figma-console-mcp.southleft.com), and specialized tools like [FigmaLint](/insights/design-systems/designing-for-developers-introducing-figmalint/) and the [Design Systems Assistant MCP](https://github.com/southleft/design-systems-mcp) give AI direct access to the design system as structured data. The AI isn’t guessing. It’s reading the actual source of truth, your tokens, your component API, your constraints.

Third, design systems themselves have matured to the point where they function as an API. When your system is structured with clear naming conventions, documented properties, and well-defined component boundaries, it becomes machine-readable context. AI can consume it, reason about it, and generate code that respects it.

## What this actually looks like

Imagine a designer has just finished a component and its full component set in Figma, variants, states, responsive behaviors, all documented with metadata and descriptions.

Today, that designer can open an AI-powered IDE, connect it to the codebase where the design system’s component library lives, and start building. The MCP servers feed the AI everything it needs: the component structure from Figma, the coding patterns already established in the repo, accessibility standards, web platform best practices. Sub-agents can enforce conventions automatically, checking that what’s being generated matches the architecture of the existing codebase.

The designer isn’t writing code from scratch. They’re guiding a process—one where their design decisions are preserved because _they’re the ones making the calls_. They can visually QA the output in real time. They can test micro-animations. They can verify that an easing curve feels right, that a hover state transitions the way they intended, that the spacing isn’t “close enough” but _correct_.

When they’re satisfied, they create a pull request from a design branch to a development branch. A context engineer, someone with deep technical expertise, reviews it, refines the implementation where needed, and merges it. The designer’s contribution doesn’t get reinterpreted. It gets refined.

This isn’t a designer pretending to be a developer. It’s a designer extending their influence into the medium where their work actually lives.

## Every organization is different, and that’s fine

Not every team will implement this the same way. The tooling stack varies. The codebase architecture varies. The organizational comfort level with this kind of role evolution varies.

What doesn’t vary is the principle: when you treat your design system as structured context and give AI access to that context, you dramatically reduce the risk of drift between design intent and shipped code. The specific combination of tools, whether it’s Figma’s native MCP or a custom implementation, whether the IDE is Cursor or something else, whether you’re building in Web Components or React, matters less than the approach.

We’re consulting with organizations on this right now. A major pharmaceutical company. One of the largest news publications in the world. These aren’t early adopters chasing hype. These are enterprise teams with complex systems, strict standards, and real pressure to ship. And they’re seeing the value because the technology works, and the desire from design teams is there.

The biggest friction isn’t technical. It’s organizational, communication, role definitions, trust. And those are solvable problems.

## The real answer to “should designers code?”

The industry has been asking this question for over a decade, and it’s always been the wrong framing. The question was never whether designers _should_ code. It was whether they _could_, in a way that’s safe, productive, and additive rather than chaotic.

The answer, for the first time, is yes.

Not because designers suddenly need to understand webpack configurations or state management patterns. But because the tools now exist to let them work within a structured, risk-reduced environment where their contributions are real, reviewable, and shippable.

Designers have always had a seat at the table. But for a long time, it felt like the kids’ table—close to the action, adjacent to the decisions, but not quite in the room where the thing actually gets built.

That room is open now. The tools are on the shelf. And there has never been a better time to walk in.
