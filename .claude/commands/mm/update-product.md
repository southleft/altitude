# Update Product Context (Brownfield)

Establish product context for an existing/brownfield project so the LLM has the same foundational understanding as greenfield projects.

This command is for projects that:

- Already exist with working code
- Don't have `.mm/product/` documentation yet
- Need product context established without starting from scratch

## PHASE 1: Analyze Existing Project

First, gather context from the existing codebase:

1. **Check for existing product docs:**
   - Look for `.mm/product/mission.md`, `roadmap.md`, `tech-stack.md`
   - Look for `README.md`, `CONTRIBUTING.md`, or other docs
   - Check `package.json`, `Cargo.toml`, or other manifest files

2. **Analyze the codebase:**
   - Identify the tech stack from dependencies and file structure
   - Look for existing features/functionality
   - Check for any existing specs in `.mm/specs/`

3. **Summarize findings** to the user:

   ```
   Here's what I found in your existing project:

   **Tech Stack:** [detected technologies]
   **Key Features:** [identified functionality]
   **Existing Docs:** [list any found]
   ```

## PHASE 2: Gather Product Context

Ask the user targeted questions to fill in the gaps. Since this is brownfield, focus on:

1. **Product Purpose:**
   - "What problem does this product solve?"
   - "Who are the primary users?"

2. **Current State:**
   - "What's the current state of the product? (MVP, production, legacy?)"
   - "What are the main features that exist today?"

3. **Future Direction:**
   - "What's the next major thing you want to build?"
   - "Any known technical debt or areas needing improvement?"

4. **Confirm Tech Stack:**
   - Present what you detected and ask for corrections/additions

## PHASE 3: Create Product Documentation

Create the `.mm/product/` directory and files:

### mission.md

```markdown
# [Product Name] - Mission

## Purpose

[What problem it solves]

## Target Users

[Who uses it]

## Core Value Proposition

[Why users choose this product]

## Current State

[MVP/Production/etc. and key existing features]

## Vision

[Where the product is heading]
```

### tech-stack.md

```markdown
# [Product Name] - Tech Stack

## Frontend

[Detected + confirmed technologies]

## Backend

[Detected + confirmed technologies]

## Database

[If applicable]

## Infrastructure

[Deployment, CI/CD, etc.]

## Development Tools

[Linters, formatters, testing frameworks]
```

### roadmap.md

```markdown
# [Product Name] - Roadmap

## Current Phase: [Phase Name]

[What's being worked on now]

## Upcoming

[Next planned work based on user input]

## Backlog

[Future ideas mentioned]

## Technical Debt

[Any areas needing improvement]
```

## PHASE 4: Generate Coding Standards

After product docs are created, offer to generate coding standards:

> Would you like me to analyze the codebase and generate coding standards? This captures your project's naming conventions, component patterns, error handling, and other conventions so the LLM follows them consistently.

**If yes:** Run the `/mm:standards` command flow (Phase 2-5 from that command). This will analyze the codebase, present findings, and generate `.mm/standards/` files.

**If no:** Skip this phase. The user can always run `/mm:standards` later.

## PHASE 5: Inform the User

After creating the files:

```
Product context established!

Created:
- `.mm/product/mission.md` - Product purpose and vision
- `.mm/product/tech-stack.md` - Technical architecture
- `.mm/product/roadmap.md` - Current and future work
[If standards were generated:]
- `.mm/standards/` - Coding standards (X domains)

This gives the LLM full context when working on this project.

NEXT STEPS:
- Run `/mm:spec` to plan your next feature
- Run `/mm:task` for one-off tasks
- Run `/mm:standards` to update coding standards
- Edit these files anytime to keep them current
```

## Notes

- This command is **additive** - it won't overwrite existing product docs
- If docs already exist, offer to **update** specific sections instead
- Focus on capturing "tribal knowledge" that exists in the developer's head
- Keep docs concise - they're for LLM context, not exhaustive documentation
