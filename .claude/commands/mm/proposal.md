# Create Proposal (Monday Morning)

Generate a complete, ready-to-review client proposal through a guided interview. Replaces placeholder-based scaffolding with an intelligent workflow that produces real content in WeekendDevs' voice.

## Usage

```
/mm:proposal [client-name] ["Project Title"]
/mm:proposal --brief       (paste a scope document for extraction)
/mm:proposal --grain       (reference a Grain meeting transcript)
/mm:proposal --spec        (reference a .mm/ spec or feature)
```

**Examples:**

- `/mm:proposal` — interactive guided interview
- `/mm:proposal "Eagle Industries" "Website Analytics Platform"` — quick start with basics
- `/mm:proposal --brief` — paste an RFP, email, or scope doc for extraction
- `/mm:proposal --grain` — pull details from a Grain meeting transcript
- `/mm:proposal --spec design-system` — pull scope from an existing .mm/ spec

---

## Input Modes

### Mode 1: Interactive Interview (default)

Run the full guided interview in stages. This is the default when no flags are provided.

### Mode 2: Paste a Brief (`--brief`)

1. Ask the user to paste an unstructured scope document, RFP, email thread, or brief
2. Read the pasted text and extract:
   - Client name and project title
   - Scope description and deliverables
   - Technical requirements or stack preferences
   - Timeline and budget mentions
   - Engagement type (infer from content)
3. Present extracted details for confirmation: "Here's what I found — correct anything that's off:"
4. Fill in missing fields by asking targeted follow-up questions (skip what was extracted)
5. Proceed to generation

### Mode 3: Grain Meeting Reference (`--grain`)

1. Ask which meeting to reference (search Grain via MCP tools if available, or ask for a transcript path)
2. Read the meeting transcript
3. Extract engagement details: client name, project scope, deliverables discussed, budget mentioned, timeline discussed, team needs
4. Present extracted details for confirmation
5. Fill in gaps with targeted questions
6. Proceed to generation

### Mode 4: Spec/Feature Reference (`--spec`)

1. Ask which spec or feature to reference (list available specs, or accept a slug argument)
2. Read the spec's `spec.md`, `requirements.md`, and `implementation.md`
3. Extract: project scope, deliverables (from tasks), technical approach (from spec), timeline estimate (from task count/sizes)
4. Ask for client name, pricing, and any details not in the spec
5. Proceed to generation

---

## Interview Flow (Interactive Mode)

### Stage 1: Client Basics

Ask conversationally, not as a form:

- **Client name** — "Who is this proposal for?"
- **Project title** — "What's the project called?"
- **Prepared by** — default "TJ Pitre" (ask: "Prepared by TJ Pitre — anyone else?")
- **Date** — default today (formatted like "March 18, 2026")

### Stage 2: Engagement Details

First ask:

- **Engagement type** — "What kind of engagement is this?"
  - Greenfield build
  - Design system
  - Team augmentation
  - Audit / consulting
  - Maintenance retainer
  - Migration
  - MVP

Then ask **engagement-specific questions** based on the type:

**Greenfield build:**

- What's the product vision? Who are the target users?
- What are the key features or modules?
- Any integrations with existing systems?

**Design system:**

- Is there existing brand/design work (Figma, Sketch)?
- What platforms need components (React, Vue, native)?
- Is Storybook documentation needed?

**Team augmentation:**

- How many people and what roles?
- Duration and integration model (embedded vs. independent)?
- What's the existing team structure?

**Audit / consulting:**

- What are we auditing (code, architecture, security, performance)?
- What are the current pain points?
- What outcomes are expected?

**Maintenance retainer:**

- What systems need maintenance?
- Estimated hours per month?
- SLA requirements?

Then for all types:

- **Complexity** — "Is this simple, medium, or complex?" (determines document depth)
- **Scope description** — "Describe the scope in a paragraph or two"
- **Key deliverables** — "What are the concrete deliverables?"
- **Technical approach** — "What's the stack? Any architecture decisions? Team composition?"

### Stage 3: Pricing & Options

- **Duration** — "How long? (weeks/months)"
- **Investment** — "What's the investment? (single amount or range)"
- **Ongoing costs** — "Any recurring costs? (hosting, APIs, maintenance)"
- **Options** — "Single option or multi-tier proposal?"
  - If multi-tier: "How many options? What differentiates them?"
  - For each option: name, scope differences, investment

### Stage 4: Review & Generate

1. **Summarize** all collected information back to the user in a clean format
2. **Ask about special sections:**
   - AI platform comparison?
   - Data migration plan?
   - Security considerations?
   - Custom section?
3. **Confirm** — "Ready to generate?"

---

## Load Style References

Before generating, check for past proposals to reference for style:

1. Check if `.mm/proposals/proposals-index.md` exists
2. If it does, find proposals matching the engagement type using the `/mm:find-style-references` algorithm
3. Read up to 3 reference proposals to extract style patterns:
   - Section ordering and heading style
   - Tone (confident, direct, warm — not salesy)
   - How options are structured (Includes/Does not include)
   - How investment is presented
   - Bullet density and paragraph length
4. If no past proposals exist, generate from the template structure alone

**Privacy rules:**

- Never mention other clients by name
- Never copy scope or pricing verbatim
- Extract structural patterns, not specific content

---

## Apply Formatting Rules

Before generating content, read `.mm/templates/format-rules.json` to determine:

1. **Section rules** — Look up the engagement type to get required/optional/excluded sections
2. **Length calibration** — Look up the complexity level (simple/medium/complex) to get target page count and section depth
3. **Multi-option pattern** — Based on user's choice (single vs. tiered), apply the correct formatting:
   - Single: flat scope section, no recommendation section needed
   - Tiered: Includes/Does not include per option, comparison, recommendation section
4. **Technical approach depth** — Look up the engagement type's `technical_depth` setting:
   - `minimal`: 1 paragraph overview (team augmentation, retainers)
   - `moderate`: architecture + stack + team (MVPs, audits)
   - `full`: comprehensive detail (greenfield, design systems, migrations)

**Boilerplate insertion** — Read snippets from `.mm/templates/boilerplate/` as needed:

- `why-weekenddevs.md` — always included, personalized with client name
- `next-steps.md` — always included
- `ai-ready-by-design.md` — included for engagements with AI components
- `team-bio-tj.md` — included in team structure sections
- `collaboration-model.md` — included in project overview
- `payment-terms-*.md` — selected based on engagement type (milestone for builds, monthly for retainers)
- `ip-ownership-*.md` — included for SOW-adjacent proposals
- `tech-stack-*.md` — selected based on stack choice
- `warranty-support.md` — included for build engagements

If format-rules.json doesn't exist, use sensible defaults (all sections, medium depth).

---

## Content Generation

Based on the interview answers, style references, and formatting rules, generate a complete `proposal.md`:

### Frontmatter

```yaml
---
type: proposal
client: '{client}'
title: '{title}'
prepared_by: '{prepared_by}'
date: '{date}'
status: draft
engagement_type: '{type}'
investment_range: '{range}'
duration: '{duration}'
team_size: '{size}'
technologies: [{ techs }]
---
```

### Document Structure

Generate all sections with **real content** — no placeholder text, no italicized prompts:

1. **Title block** — "Proposal" label, project name, prepared by, client
2. **Executive Summary** — 2-3 paragraphs: why we're excited, what the engagement includes, key value proposition
3. **Project Overview** — what we'll do, bulleted approach
4. **Scope sections** — varies by option count:
   - **Single option:** One "Scope & Deliverables" section with Includes bullets
   - **Multi-option:** Separate H2 per option (e.g., "Option 1: Foundation"), each with:
     - Brief intro paragraph
     - **Includes:** bullet list
     - **Does not include:** one-liner
5. **Technical Approach** — architecture, stack, how it's built (depth based on complexity)
6. **Timeline & Investment** — table format for multi-option, or bold fields for single
7. **Our Recommendation** — direct, opinionated (which option and why)
8. **Next Steps** — standard 4-step list
9. **Why WeekendDevs** — use the boilerplate from the template, personalized with client name

### Length Calibration

| Complexity | Pages | Options | Technical Depth             |
| ---------- | ----- | ------- | --------------------------- |
| Simple     | 1-2   | 1       | Brief stack summary         |
| Medium     | 3-5   | 2-3     | Architecture + stack + team |
| Complex    | 5-10  | 3-4+    | Full technical detail       |

### Voice and Tone

- Professional but warm — like a trusted advisor, not a vendor
- Direct and confident — state recommendations clearly
- Specific — use real technical terms, not vague promises
- Honest about scope boundaries — "Does not include" is a feature, not a limitation
- Match the tone from past reference proposals if available

---

## Output

1. Write to `.mm/proposals/{YYYY-MM-DD}-{client-slug}/proposal.md`
2. If directory exists, warn and ask: overwrite or create versioned copy?
3. Display confirmation:

```
Proposal Generated

  client       {Client Name}
  title        {Project Title}
  type         {engagement type}
  complexity   {simple/medium/complex}
  options      {N} options
  refs         {N} past proposals referenced for style
  path         .mm/proposals/{YYYY-MM-DD}-{client-slug}/proposal.md

Export to branded PDF now?
  /mm:export-proposal {YYYY-MM-DD}-{client-slug}
```

---

## Related Commands

- `/mm:export-proposal` — Export to branded PDF
- `/mm:doc-scaffold sow` — Create a Statement of Work
- `/mm:doc-scaffold estimate` — Create an Estimate
- `/mm:doc-scaffold change-order` — Create a Change Order
- `/mm:index-proposals` — Rebuild proposals index
- `/mm:import-proposal` — Import a .docx or .pdf proposal
- `/mm:find-style-references` — Find matching past proposals
