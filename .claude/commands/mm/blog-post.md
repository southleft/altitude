# Write Blog Post (Monday Morning)

Write an SEO and AEO-optimized blog article for the Monday Morning marketing site.

## Input

The user provides one of:

- A topic or title idea
- A keyword to target
- A rough outline
- "suggest topics" to get recommendations

## Author Selection (Interactive)

Before writing, ask the user who should be listed as the author:

1. **Angela Edmundson** — LinkedIn: https://www.linkedin.com/in/angela-edmundson-6272b157/
2. **Justin Young** — LinkedIn: https://www.linkedin.com/in/justinmmyoung/
3. **Other** — Ask for name (and optionally LinkedIn URL)

The author name must exactly match a key in `sites/marketing/src/lib/blog.ts` `AUTHORS` map for the LinkedIn link to render automatically. If "Other" is chosen and has a LinkedIn, add them to the `AUTHORS` map in `blog.ts` as well.

## Topic Suggestion Mode

If the user says "suggest topics" or doesn't provide a specific topic, generate 5-8 article ideas across these content pillars:

1. **AI-Assisted Development** — workflows, productivity, Claude Code tips
2. **Project Management for Developers** — specs, task tracking, async work
3. **MCP & Tool Ecosystem** — MCP servers, integrations, building tools for AI
4. **Context & Knowledge Management** — context recovery, documentation, institutional knowledge
5. **Industry Trends** — AI coding landscape, developer tools market, what's changing

For each suggestion, include: title, target keyword, search intent, estimated difficulty.

## Research Phase

Before writing, research the topic:

1. **Search intent** — What is someone searching this keyword actually trying to learn or do?
2. **Existing content** — Use WebSearch to check what currently ranks. Identify gaps.
3. **Related questions** — Find "People Also Ask" style questions for the FAQ section.
4. **Monday Morning angle** — How does this topic connect to what MM does? The connection should be natural, not forced. Some posts won't mention MM at all — that's fine.

## Writing Guidelines

### Structure for SEO

- **Title**: Include primary keyword. Under 60 characters. Compelling, not clickbait.
- **Description**: 150-160 characters. Include keyword. Answer the search intent.
- **H2s and H3s**: Use keyword variations naturally. These become the table of contents.
- **Opening paragraph**: State the problem or hook in 2-3 sentences. Get to the point.
- **Body**: 1,200-2,500 words. Practical, specific, opinionated. Avoid filler.
- **Internal links**: Link to other MM blog posts, docs, or product pages where relevant.
- **Closing**: Clear takeaway or next step. No "in conclusion" padding.

### Structure for AEO (Answer Engine Optimization)

- **FAQ section**: 3-6 questions in frontmatter `faq` array. These get FAQPage JSON-LD schema.
- **Direct answers**: Start key sections with a clear, quotable answer sentence before elaborating. AI engines extract these.
- **Definition patterns**: When defining a concept, use "X is..." format in the first sentence of a section.
- **Listicle sections**: Numbered or bulleted lists are easily extracted by AI engines.

### Voice & Tone

- Developer-to-developer. Knowledgeable but not academic.
- Opinionated — take a stance, don't hedge everything.
- Concrete examples over abstract explanations.
- No corporate fluff: "leverage", "synergy", "unlock", "empower".
- No emoji in body text.
- Short paragraphs (2-4 sentences max). Dense with information.

### What NOT to do

- Don't stuff keywords unnaturally
- Don't write generic "top 10 tools" listicles with no original insight
- Don't make every post a product pitch — most posts should provide standalone value
- Don't use AI-obvious patterns: "In today's fast-paced world...", "Let's dive in!", "In conclusion..."
- Don't pad with filler to hit word count — shorter and useful beats longer and fluffy

## Output Format

Create a new MDX file at `sites/marketing/content/blog/{slug}.mdx` with this frontmatter:

```yaml
---
title: 'Your Title Here'
description: '150-160 char meta description with keyword'
date: 'YYYY-MM-DD'
author: 'Angela Edmundson' # or "Justin Young" — must match AUTHORS map
category: 'One of the 5 pillars above'
tags:
  - keyword-one
  - keyword-two
  - keyword-three
faq:
  - question: 'Natural question someone would ask?'
    answer: 'Direct, complete answer in 1-3 sentences. This appears in FAQ schema.'
  - question: 'Another question?'
    answer: 'Another answer.'
---
```

Then the article body in markdown.

## Hero SVG Illustration

After writing the article, create a custom SVG illustration at `sites/marketing/content/blog/{slug}.svg`. This SVG is displayed as the hero image on the blog post and listing page.

**Requirements:**

- ViewBox: `0 0 800 200`
- Dark background: `hsl(220 13% 10%)`
- Use the site's color palette: `--mm-primary` (indigo), `--mm-secondary` (gold), plus emerald, cyan, violet, pink for accents
- Include a subtle grid pattern as background
- Must visually represent the article's **specific topic** — not a generic pattern
- Use SVG animations (SMIL `<animate>`, `<animateTransform>`) for subtle motion: pulsing dots, flowing dashes, blinking cursors, scanning lines
- Include monospace text fragments related to the content
- Corner bracket accents matching the terminal aesthetic
- Keep all IDs unique (prefix with slug abbreviation) to avoid conflicts when multiple SVGs are on one page

**Design ideas by content type:**

- **Workflow articles**: Show a left-to-right flow diagram (input → process → output)
- **Tool articles**: Show the tool's interface or architecture diagram
- **Concept articles**: Show the concept as a visual metaphor (e.g., brain → file → AI for context recovery)
- **How-to articles**: Show the command/code being demonstrated with a terminal mock

Reference existing SVGs in `sites/marketing/content/blog/*.svg` for style consistency.

## After Writing

1. Read the article back and check:
   - Does the title include the target keyword?
   - Is the description under 160 characters?
   - Are there 3-6 FAQ items?
   - Is the content 1,200-2,500 words?
   - Does every section provide value, or is there filler to cut?
   - Are H2s descriptive and keyword-relevant?
2. Report to the user:
   - Target keyword
   - Word count
   - FAQ count
   - File path
   - Suggested internal links to add once more content exists

## Content Calendar Context

When suggesting topics, consider what already exists. Read the existing posts:

```
sites/marketing/content/blog/*.mdx
```

Avoid duplicating existing topics. Build on them — link to them, reference them, go deeper on subtopics.
