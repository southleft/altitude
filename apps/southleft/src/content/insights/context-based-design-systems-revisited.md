---
title: "Context-Based Design Systems, Revisited"
date: 2026-05-13
category: "design-systems"
categoryName: "Design Systems"
excerpt: "A year into the AI-driven design systems era, the framework holds up. Here’s what’s changed, what’s clearer, and why context still beats autonomy."
hero: "https://southleft.pages.dev/media/two_abstract_geometric_form.webp"
---

A while back, [I wrote about a workflow](/insights/design-systems/context-based-design-systems-a-new-model-for-the-ai-driven-product-lifecycle/) we were starting to call Context-Based Design Systems. The idea was simple in principle and harder in practice. If you let context flow through every phase of the product lifecycle, each step gets smarter than the one before it. Design informs code. Code informs documentation. Documentation informs the next round of design. The system gets clearer over time instead of murkier.

A year later, the framework holds up. But the landscape around it has changed enough that it’s worth revisiting.

AI in design systems went from speculative to operational. MCP went from a niche protocol to connective tissue across the stack. A real discourse has emerged around what people now call agentic design systems. Most of it is thoughtful. Some of it overlaps with what we were saying. Some of it goes in a different direction.

So this piece is partly an update and partly a sharpening. Same thesis. More precision.

## What Held Up

The core idea was that context, not data, is the unit of value. Tokens, components, and documentation are useful. But what makes a system work is the meaning that travels with them. The intent behind a button. The conditions where a pattern applies. The reasons something exists at all.

A year of working in this space has only made that clearer. Every team I’ve worked with that struggles with AI-assisted workflows has the same root issue. The components are there. The tokens are there. But the meaning is missing or scattered, and [AI can’t reason about what it can’t read](https://southleft.substack.com/p/anatomy-of-an-ai-ready-design-system).

The chain reaction framing also held up. Strong context upstream produces accurate output downstream. Weak context upstream produces drift that scales with whatever tooling you point at it. Bad metadata at machine speed is worse than bad metadata at human speed, because it’s harder to notice and faster to spread.

And the Context Engineer role, which I named in the original piece, has only become more relevant. These are not prompt engineers. They’re system stewards. They own the fidelity of the entire flow from intent to production, and they care more about whether the system can be trusted than whether the output looks impressive.

## What’s Changed

A few things have shifted enough to be worth naming.

The agentic frame arrived. Agents that can read a design system, propose changes, validate them, and escalate when something feels risky. Most of the serious thinking in this space has landed in roughly the same place. Structure beats prompts. Components should carry contracts, not just visual properties. Governance matters. Boring, scoped agents are more useful than glamorous, autonomous ones.

I agree with most of it. Where I land differently is on the operating model.

The implicit shape of an agentic workflow is propose-and-approve. The agent initiates. The human enters when the agent escalates. Even in the most careful versions, the AI is upstream and the human is the gate.

CBDS reverses that order. The human is upstream. The AI executes inside constraints a person already set. Every action has a thread you can follow back to a human decision. The orchestrator stays ahead of the work, not behind it.

This is a small distinction on paper and a meaningful one in practice. Propose-and-approve assumes the human will catch what matters. Orchestrate-and-execute assumes the human is already there.

I’m not arguing that one approach is right and the other is wrong. Plenty of teams will run agentic workflows successfully. I’m saying that, for the kinds of design systems we work on and the kinds of organizations we partner with, the context-based approach gives the human more room to stay ahead. And that matters more to me than the speed gains right now.

## What CBDS Is, and What It Isn’t

The clearest way to draw the line is to say what the framework is and what it’s not.

#### **What CBDS is:**

-   A workflow where context flows through every phase of the product lifecycle, not just the design phase
-   Components that carry intent, behavior, accessibility, and usage rules, not just visual properties
-   A human-led operating model where the AI executes inside boundaries a person defined
-   A way to bring product designers into the code contribution layer in a meaningful way
-   A discipline that treats design QA with the same rigor as code QA

<figure class="wp-block-image size-full"><img loading="lazy" decoding="async" width="2376" height="794" src="https://southleft.pages.dev/media/cbds-diagram.webp" alt="" class="wp-image-3514" srcset="https://southleft.pages.dev/media/cbds-diagram.webp 2376w, /media/cbds-diagram.webp 800w, /media/cbds-diagram.webp 1400w, /media/cbds-diagram.webp 768w, /media/cbds-diagram.webp 1536w, /media/cbds-diagram.webp 2048w" sizes="auto, (max-width: 2376px) 100vw, 2376px"><figcaption class="wp-element-caption">Context flows through artifacts. Humans stay present throughout.</figcaption></figure>

#### **What CBDS isn’t:**

-   Not a system where agents propose changes and humans rubber-stamp them
-   Not autonomous maintenance of the design system
-   Not a replacement for the people who steward the system
-   Not a bet that the AI will catch its own mistakes
-   Not “humans in the loop” as a polite afterthought

The orchestrator is not the reviewer at the gate. The orchestrator is the one driving.

## The Real Shift: Designers Contributing Code

The most interesting change in the last year isn’t about AI getting better. It’s about who gets to do which part of the work.

For two decades, the design-to-development handoff has been a translation problem. Designers describe an experience. Engineers reconstruct it in code. The micro-interactions, the easing equations, the scroll-linked transitions, the fade timings, all the things that separate a good interface from a great one, often get approximated rather than faithfully built. Two or three weeks of back-and-forth later, the result is close but never exact. Sometimes the designer gives up trying to get it right.

CBDS changes the order of operations.

In a CBDS workflow, the designer works in a design branch. With AI assistance, they produce the first coded version of the component themselves. They visually QA their own work in code. They iterate on the things only they can feel, the timings, the curves, the negative space, the moments of delight. When the component matches their intent, they open a pull request.

The context engineer takes it from there. They enforce coding standards, write or expand tests, validate accessibility, check type safety, integrate it into the system, version it, and ship it.

What this changes is the value stack. Every role moves up.

-   Designers contribute the first meaningful version of the code, not just the design spec
-   Context engineers focus on system integrity, not reconstruction
-   Product owners get faster feedback and more accurate first drafts
-   The whole loop shortens, not because anyone is moving faster, but because no one is duplicating work

This isn’t a free lunch. It requires designers who want to work this way, engineering cultures that accept designer-authored pull requests, and tooling that makes the round trip viable. None of that is given. Some designers don’t want to code. Some teams aren’t ready to share the keyboard. The cultural shift is harder than the technical one.

But for the teams that are ready, the old “should designers code” debate has quietly resolved itself. The question now is who gets to author the first draft, and AI made that question answerable in a way it wasn’t before.

## The Context Engineer, Revisited

A year ago, I described the Context Engineer as a system steward. Someone who understands metadata, model context protocols, and the nuances of how systems communicate across tools. Someone who refines what AI suggests and guards the fidelity of the flow.

That definition still holds. What’s clearer now is where they sit in the work.

They are not gatekeepers at the end of the pipeline. They are in session, alongside the work, throughout. They make the upstream decisions the AI executes against. They define the constraints. They steward the contracts. They stay ahead of the AI so the AI doesn’t have to be trusted to stay ahead of them.

The job, simplified: own the trust layer. Make sure that when something ships, you can trace why it shipped, who decided what, and what the AI was authorized to do at every step.

That’s the role. It’s not glamorous. It’s exactly what serious design systems need.

## Why Context Still Beats Autonomy

Autonomy is a tempting frame because it promises speed. And speed is real. Agents can move boring work faster than any team can.

But speed without context creates drift you have to undo later. Speed with context compounds.

The teams that win aren’t the ones with the most agents. They’re the ones with the clearest context flowing through their systems and people who know how to steward it.

We’ve spent the last year building tools and workflows around this idea. [Figma Console MCP](https://figma-console-mcp.southleft.com/), the platform we use across nearly every engagement, is one expression of it. The [AI and Design Systems](https://aianddesign.systems/) course Brad Frost, Ian Frost, and I are putting together is another. The workshops we run with teams are a third.

The throughline is always the same. Build the context. Steward the context. Let the AI work inside it.

Tools change fast. Context compounds.

### Where This Goes Next

The framework will keep evolving. The vocabulary will too. A year from now there will be new terms for what we’re doing now, and probably some of them will be sharper than what we have today.

The principles won’t change. Strong upstream context. Humans orchestrating, not reviewing. Components that carry meaning, not just appearance. Designers contributing the first version. Context engineers stewarding the rest.

If you’re working through this on your team and want to compare notes, I’d love to talk. The conversation is more interesting than the discourse.
