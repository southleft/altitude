# Codebase Analysis Q&A Session

Perform a deep codebase analysis with a reflection pattern, then engage in a bidirectional Q&A session. The result is saved as an analysis entity.

## Phase 1: Scope & Analyze (Reflection Pattern)

### 1a. Determine Scope

If the user provided a scope argument (e.g., `/mm:analysis src/auth/`), use that as scope.

Otherwise, ask:

> What part of the codebase do you want to analyze? (e.g., a directory, module, subsystem, or broad topic like "authentication" or "data flow")

Also determine the category — auto-detect or ask:

- **Architecture** — System structure, module boundaries, dependencies
- **Quality** — Code quality, patterns, anti-patterns, tech debt
- **Security** — Security posture, vulnerability surface
- **Performance** — Performance characteristics, bottlenecks
- **Data Flow** — How data moves through the system
- **Integration** — External service integrations, APIs

### 1b. Analyze (Initial Pass)

Read the relevant files in the scoped area. Produce an initial analysis covering:

- **Architecture**: How the code is structured, module boundaries, key abstractions
- **Patterns**: Design patterns in use, consistency of approach
- **Quality**: Code quality observations, maintainability
- **Risks**: Potential issues, tech debt, fragile areas
- **Dependencies**: Key internal and external dependencies

### 1c. Critique (Self-Reflection)

After producing the initial analysis, self-critique:

- What claims are unsupported by evidence in the code?
- What areas were skimmed or assumed rather than verified?
- What's missing that a senior engineer would want to know?
- Are there contradictions or oversimplifications?

### 1d. Refine

Produce a final, refined analysis that addresses the critique. Remove unsupported claims, add evidence for assertions, and fill gaps identified during critique.

---

## Phase 2: Bidirectional Q&A

Present the refined analysis to the user, then begin the Q&A session.

### Opening

After presenting the analysis, ask 2-3 probing questions — things that require human context to answer. For example:

- Why was a particular pattern chosen?
- Is a seemingly duplicated approach intentional?
- What's the history behind an unusual design decision?

### Q&A Loop

The user can:

1. Answer your questions
2. Ask their own questions about the analysis or the code
3. Signal they're done with: "done", "save", "end session", or similar

Track each Q&A pair with speaker attribution:

- Questions from Claude: `### Q{N} (Claude): {question}`
- Answers from User: `**A{N} (User):** {answer}`
- Questions from User: `### Q{N} (User): {question}`
- Answers from Claude: `**A{N} (Claude):** {answer}`

Number Q&A pairs sequentially regardless of who asks.

Continue the loop until the user signals done.

---

## Phase 3: Save

### 3a. Generate Key Findings

Synthesize a bullet-point summary of the most important findings from the analysis and Q&A session.

### 3b. Create Analysis File

1. **Get the current timestamp** by running: `date '+%Y-%m-%d %H:%M'` — use the output as `{YYYY-MM-DD HH:MM}`. Do NOT guess the time; always use this command.
2. Create slug from title: lowercase, hyphens, no special chars
3. Get the date portion for filenames by running: `date '+%m-%d-%Y'`
4. Filename: `.mm/analyses/{slug}-{MM-DD-YYYY}.md`

### File Template

```markdown
---
title: { Analysis Title }
category: { Category }
scope: { scope path or description }
created: { YYYY-MM-DD HH:MM }
updated: { YYYY-MM-DD HH:MM }
status: complete
question_count: { total Q&A pairs }
---

# {Analysis Title}

**Category:** {Category} | **Scope:** {scope} | **Created:** {YYYY-MM-DD HH:MM}

## Initial Analysis

{Refined analysis from Phase 1d}

## Q&A Session

{All Q&A pairs from Phase 2, formatted with ### headers and speaker attribution}

## Key Findings

{Bullet summary from Phase 3a}

## Related

{Links to specs, issues, or notes mentioned during the session, or "None"}
```

### 3c. Create/Update Dashboard

Create `.mm/analyses/` directory if needed.

If `.mm/analyses/analyses.md` exists, read it and add the new entry at the top of the `## Analyses` section.

If it doesn't exist, create it:

```markdown
# Analyses Dashboard

Last updated: {YYYY-MM-DD HH:MM}

## Analyses

- [ ] **{YYYY-MM-DD}** [{Title}](./{filename}) - {Category} - {N} Q&As
```

Dashboard entry format (MUST use checkbox for Monday Morning parsing):

```markdown
- [ ] **{YYYY-MM-DD}** [{Title}](./{filename}) - {Category} - {N} Q&As
```

Update "Last updated" timestamp.

### 3d. Confirm

```
Analysis Saved

{Title}
Category: {Category}
Scope: {scope}
Q&A Count: {N}
File: `.mm/analyses/{filename}`

View in Monday Morning > Analyses
```
