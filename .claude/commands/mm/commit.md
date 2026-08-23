# Commit Changes (Monday Morning)

Create a well-structured commit from staged files and recent changes, then push to the current branch.

## Overview

This command:

1. Analyzes staged changes and unstaged modifications
2. Generates a structured commit message
3. Commits and pushes to the current branch

## Commit Message Structure

Use this exact format for all commits:

```
{Title}

{Description sentence explaining what this commit accomplishes.}

What it does:

- {Bullet point explaining functionality}
- {Another bullet point}
- {More as needed}

{Section header based on change type}:

- {What was added/changed} - {Brief description}
- {Another change} - {Brief description}
```

### Section Headers

Choose the appropriate section header(s) based on what changed:

- **New files:** - For newly created files
- **New endpoints:** - For API routes added
- **New components:** - For UI components added
- **Changes:** - For modifications to existing files
- **Removed:** - For deleted files/features
- **Integration:** - For how features connect to existing code
- **Database:** - For migrations or schema changes
- **Configuration:** - For config file changes

### Example Commit Message

```
Add People Data Enrichment

Automatically enriches person entities with professional data from web search after entity extraction.

What it does:

- Searches for people using Serper.dev (Google Search API)
- Extracts profile data (role, org, location, bio, LinkedIn) via GPT-4o-mini
- Auto-saves high-confidence matches, flags medium-confidence for review
- Respects daily limits (10/day default)

New endpoints:

- POST /api/enrichment/trigger - Manual enrichment
- GET /api/enrichment/[personId] - Get enrichment status
- POST /api/enrichment/[personId]/verify - User verification
- GET /api/enrichment/usage - Usage stats

Integration:

- Enrichment auto-triggers after entity extraction completes
```

## Step 1: Analyze Changes

Run these commands to understand what's being committed:

```bash
git status
git diff --staged
git diff
git log -3 --oneline
```

Identify:

- What files are staged
- What files have unstaged changes (ask if they should be included)
- The current branch name
- Recent commit style for consistency

## Step 2: Stage Additional Changes (if needed)

If there are unstaged changes, ask:

```
I found unstaged changes in:
- src/components/Button.tsx (modified)
- src/utils/helpers.ts (modified)

Include these in the commit?
[1] Yes, include all
[2] Let me select which ones
[3] No, only commit staged files
```

Stage selected files with `git add`.

## Step 3: Generate Commit Message

Analyze the changes and generate a structured message:

1. **Title**: Summarize the main change in imperative mood
   - Good: "Add user authentication", "Fix login redirect bug"
   - Bad: "Added authentication", "Fixing bugs"

2. **Description**: One sentence explaining the purpose

3. **What it does**: List the functional changes (user-facing behavior)

4. **Section with changes**: List specific files/endpoints/components added or modified

### Guidelines

- Keep title under 50 characters if possible
- Each bullet point should be concise but informative
- Group related changes under appropriate section headers
- Focus on WHAT changed and WHY, not HOW

## Step 4: Show Preview and Confirm

Display the generated commit message:

```
Commit Preview
──────────────

{Generated commit message}

──────────────

Branch: {current-branch}
Files: {count} files changed

[1] Commit and push
[2] Edit message
[3] Cancel
```

## Step 5: Commit and Push

Execute:

```bash
git commit -m "{message}"
git push origin {current-branch}
```

If push fails due to remote changes:

```
Remote has new changes. Pull and retry?
[1] Yes, pull and push
[2] No, just commit locally
```

## Step 6: Confirm Success

```
Committed and pushed to {branch}

{commit-hash} {title}

{file-count} files changed, {insertions} insertions(+), {deletions} deletions(-)
```

## Edge Cases

### No Changes

```
No changes to commit. Working tree is clean.
```

### Merge Conflicts

```
Cannot commit - merge conflicts detected in:
- src/file.ts

Resolve conflicts first, then run /mm:commit again.
```

### Detached HEAD

```
Warning: You're in detached HEAD state.
Create a branch first? [y/n]
```

### Large Commits

If more than 20 files changed:

```
This is a large commit ({count} files). Consider breaking it into smaller commits.
Continue anyway? [y/n]
```

## Quick Mode

If user provides a message upfront:

```
/mm:commit Add dark mode support
```

Still generate the full structured message, but use the provided text as the title.

## Integration

- Works with any git repository
- Respects .gitignore
- Uses current branch (never force pushes)
- Safe: always shows preview before committing
