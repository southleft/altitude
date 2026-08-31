# Deliberate — Contextual Briefing (Monday Morning)

Deliberation mode — think through a stakeholder message, process question, or cross-team coordination issue with targeted project context.

## Usage

```
/mm:deliberate [topic or pasted message]
```

**Examples:**

- `/mm:deliberate` — interactive mode, asks what you need to think through
- `/mm:deliberate "VIA team asking about merge timeline for big-medium-next"` — direct topic
- `/mm:deliberate` then paste a multi-line Slack message or email

## When to Use This vs Other Commands

| Use `/mm:deliberate` when...        | Use `/mm:task` when... | Use `/mm:context` when... |
| ------------------------------ | ---------------------- | ------------------------- |
| Thinking through a question    | Implementing code      | Loading project state     |
| Drafting a response            | Small code change      | Starting your work day    |
| Process/coordination decisions | Bug fix                | Deciding what to work on  |
| Stakeholder communications     | Adding a feature       | General orientation       |

---

## Workflow

### Phase 1: Capture Input

**If a topic/message was provided as an argument:**

- Use it as the raw input
- Proceed directly to Phase 2

**If no argument provided:**

- Ask: "What do you need to think through? Paste a message, describe a situation, or ask a question."
- Wait for the user's input

### Phase 2: Parse Signals

Silently analyze the input to extract actionable signals. Do NOT show this parsing to the user — use it to guide context gathering.

**Extract these signal types:**

1. **GitHub URLs** — Look for patterns like:
   - `github.com/{org}/{repo}/pull/{number}`
   - `github.com/{org}/{repo}/issues/{number}`
   - `#{number}` when repo context is clear
   - Extract: org, repo, PR/issue numbers

2. **Branch names** — Look for:
   - Explicit branch references (e.g., `big-medium-next/main`, `feature/xyz`)
   - Keywords like "merge into master", "the main branch"
   - Extract: branch names, merge direction

3. **People and teams** — Look for:
   - Named people or team names (e.g., "VIA team", "John from platform")
   - Role references (e.g., "the client", "our DevOps")
   - Extract: who's asking, their role/relationship

4. **Urgency signals** — Look for:
   - Blocking language: "blocking", "forced to", "can't deploy", "failing"
   - Timeline pressure: "immediately", "until this is done", "when can we"
   - Workaround language: "not the cleanest", "temporary", "dev tags"
   - Extract: urgency level (blocking / time-sensitive / planning)

5. **Explicit asks** — Look for:
   - Direct requests: "merge these", "provide timeline", "how should we"
   - Questions: anything ending in `?`
   - Extract: list of concrete asks

### Phase 3: Gather Targeted Context

Based on the parsed signals, gather context from relevant sources. **Only fetch what the signals indicate is needed** — don't load everything.

Run these in parallel where possible:

#### 3a: Git Context (if branch names or merge topics detected)

Use Bash tool to run:

```bash
# List relevant branches
git branch -a | grep -i "{branch_keyword}"

# If merge timeline is the topic — show divergence
git log --oneline {branch1}..{branch2} | head -20
git diff --stat {branch1}...{branch2} | tail -5

# Recent activity on the branch
git log --oneline -10 {branch_name}
```

Skip this entirely if no branch/merge signals were detected.

#### 3b: GitHub Context (if PR URLs or repo references detected)

Use GitHub MCP tools:

- For each mentioned PR: `mcp__github__get_pull_request` — get status, mergeable state, CI checks
- For mentioned PRs: `mcp__github__get_pull_request_files` — scope of changes
- If no specific PRs but a merge topic: `mcp__github__list_pull_requests` filtered by branch

Skip this entirely if no GitHub signals were detected.

#### 3c: MM Project Context (always, but lightweight)

Use MM MCP tools:

- `mcp__monday-morning__mm_search` with 2-3 keywords from the input — find related notes, specs, decisions
- If a related spec is found, read its `spec.md` title and goal (not the full spec)

Keep this lightweight — 1-2 search calls maximum.

#### 3d: Grain Meeting Context (if people/teams or decisions are mentioned)

Use Grain MCP tools:

- `mcp__monday-morning__mm_get` (with `entity: "meeting_context"`) — check for recent meeting notes with relevant decisions or action items
- If specific people are mentioned, `mcp__claude_ai_Grain__search_meetings` with their name

Skip this entirely if no meeting/people signals were detected.

### Phase 4: Structured Analysis

Synthesize all gathered context into a structured briefing. Output this to the user:

```markdown
## Briefing: {Topic Title — short, descriptive}

### Situation

{2-3 sentences summarizing what's happening, grounded in the context you gathered.
State facts from git/GitHub/MM, not assumptions.
Example: "The big-medium-next/main branch has diverged from master by 47 commits over 3 weeks. Two PRs (#723, #735) updating GitHub Actions version tags have not been merged into this branch, causing CI failures."}

### Stakeholder

{Who's asking and what they need.
Example: "The VIA team (downstream consumer of svm-frontend) is blocked from using stable release tags. They're working around this by deploying dev tags, which is functional but fragile."}

### Findings

{Organized by source — only include sources that returned useful data:}

**Git:** {branch state, divergence, recent activity}
**PRs:** {status, mergeable, CI state, blockers}
**Project:** {related specs, decisions, notes from .mm/}
**Meetings:** {relevant discussions, action items, decisions}

### Immediate Actions

1. {Concrete action} — {owner if identifiable}
2. {Concrete action} — {owner if identifiable}
   {Keep to 2-4 actions. Be specific — "Merge PR #723 into big-medium-next/main" not "Address the PR situation"}

### Strategic Considerations

- {Longer-term implication or dependency}
- {Risk if not addressed}
  {Only include if the situation has strategic dimensions beyond the immediate fix}

### Risk Assessment

{One paragraph: what happens if no action is taken? Timeline to impact.
Example: "If the GitHub Actions format changes aren't merged, all CI workflows on big-medium-next will fail on the next push. The VIA team will remain on dev tags, which lack the testing guarantees of release tags."}
```

**Formatting rules:**

- Lead with facts from gathered context, not generic advice
- Use specific numbers, commit counts, PR numbers — not vague references
- If a data source returned nothing useful, omit that section from Findings
- Keep the total briefing under 500 words

### Phase 5: Response Draft

After presenting the analysis, offer to draft a response:

```
Draft a response to share with the team? (yes / no / adjust tone)
```

**If yes:** Draft a response that:

- Acknowledges the concern (don't be dismissive)
- States the immediate actions with owners and rough timeline
- Provides context on the strategic question if applicable
- Matches the tone of the original message (casual Slack → casual response, formal email → formal response)
- Is concise — aim for the same length or shorter than the original message

**If "adjust tone":** Ask what tone they want (more direct, more diplomatic, more technical, more casual) and redraft.

**If no:** End the briefing.

### Phase 6: Optional Follow-ups

After the response draft, offer actionable next steps if appropriate:

```
Next steps:
- Create an issue to track this? (/mm:issue)
- Add a note documenting this decision? (/mm:note)
- Need to look at the code? (/mm:task)
```

Only suggest follow-ups that make sense for the situation. Don't always show all three.

---

## Signal-to-Source Mapping

This table guides which context sources to query based on detected signals:

| Signal detected    | Git                      | GitHub              | MM            | Grain             |
| ------------------ | ------------------------ | ------------------- | ------------- | ----------------- |
| PR URLs            | -                        | Fetch PRs           | -             | -                 |
| Branch names       | Branch state, divergence | Open PRs for branch | -             | -                 |
| Merge/deploy topic | Branch diff              | PR status           | Related specs | -                 |
| People/teams       | -                        | -                   | -             | Meeting search    |
| Process question   | -                        | -                   | Search notes  | Meeting decisions |
| Timeline question  | Recent commits           | PR age              | Spec progress | Action items      |
| Blocking/urgent    | -                        | CI status           | Open issues   | -                 |

---

## MCP Tools Used

| Source | Tool                                                           | When                                |
| ------ | -------------------------------------------------------------- | ----------------------------------- |
| Git    | Bash (`git branch`, `git log`, `git diff`)                     | Branch/merge signals                |
| GitHub | `mcp__github__get_pull_request`                                | PR URLs detected                    |
| GitHub | `mcp__github__get_pull_request_files`                          | PR scope needed                     |
| GitHub | `mcp__github__list_pull_requests`                              | Branch merge topic, no specific PRs |
| MM     | `mcp__monday-morning__mm_search`                               | Always (lightweight keyword search) |
| Grain  | `mcp__monday-morning__mm_get` with `entity: "meeting_context"` | People/decision signals             |
| Grain  | `mcp__claude_ai_Grain__search_meetings`                        | Specific people mentioned           |
