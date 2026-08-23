---
description: Import a skill from a URL or local file
---

# Import Skill

Import an external Claude Code skill into this project.

## Usage

```
/mm:import-skill <url-or-path>
```

## Arguments

The argument is auto-detected:

- If it starts with `https://`, it's treated as a URL
- Otherwise, it's treated as a local file path

## What it does

1. Fetches content from the URL or reads the local file
2. Validates the skill content (UTF-8, frontmatter, size)
3. Checks for duplicate skills
4. Injects source tracking metadata (source_url, imported_at)
5. Saves to `.claude/skills/{slug}/SKILL.md`

## Examples

```
/mm:import-skill https://github.com/user/repo/blob/main/skills/my-skill.md
/mm:import-skill /path/to/local/skill.md
```
