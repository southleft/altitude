# Generate Changelog (Monday Morning)

Generate changelog entries from git history since the last version bump.

## Usage

```
/mm:changelog [version]
```

**Examples:**

- `/mm:changelog` — Generate entries for unreleased changes since last version
- `/mm:changelog 0.59.0` — Generate entries and label them as a specific version

## Workflow

### Step 1: Find the last version boundary

Run:

```bash
git log --oneline --all --grep="bump version" -1
```

This gives you the commit hash of the last version bump. All commits after this are unreleased changes.

### Step 2: Gather commits since last version

Run:

```bash
git log --oneline {last_bump_hash}..HEAD
```

### Step 3: Classify each commit

Read each commit message and classify it:

| Prefix/Pattern                           | Category                           |
| ---------------------------------------- | ---------------------------------- |
| `feat:`                                  | Added                              |
| `fix:`                                   | Fixed                              |
| `refactor:`, `chore:`                    | Changed                            |
| `Implement:`                             | Added (extract the task/spec name) |
| `revert:`                                | Removed                            |
| Anything with "remove", "delete", "drop" | Removed                            |

**Skip these commits:**

- Version bump commits (`chore: bump version`)
- Merge commits
- WIP/accumulation commits (`chore: commit accumulated`)
- Test-only commits (unless they add a significant test suite)

### Step 4: Group and deduplicate

Group related commits into single entries. For example, if there are 5 `Implement: T1-T5` commits for the same spec, combine them into one entry describing the feature, not 5 separate lines.

**Grouping rules:**

- Commits referencing the same spec → one entry per spec/feature
- Multiple fixes to the same area → one "Fixed" entry
- Sequential implementation commits → one "Added" entry describing what was built

### Step 5: Generate the changelog section

Output in Keep a Changelog format:

```markdown
## [{version}] - {YYYY-MM-DD}

### Added

- **{Feature name}** — {one-line description of what it does and why it matters}

### Changed

- {What changed and how it affects users}

### Fixed

- {What was broken and how it's fixed}

### Removed

- {What was removed and why}
```

**Writing style:**

- Lead with the user-facing feature name in bold
- One line per entry — no bullet sub-lists
- Focus on what the user gets, not implementation details
- Use em-dash (—) to separate feature name from description
- Skip empty categories (don't show `### Removed` if nothing was removed)

### Step 6: Present for review

Show the generated section and ask:

```
Generated changelog for {version}:

{the section}

Options:
- Apply — Write to CHANGELOG.md under ## [Unreleased] (or replace it with the versioned section)
- Edit — Let me adjust before applying
- Skip — Don't write, just show
```

### Step 7: Apply if approved

If the user approves:

1. Read `CHANGELOG.md`
2. If a version was specified: Replace the `## [Unreleased]` section content with the new versioned section, and add a fresh empty `## [Unreleased]` above it
3. If no version specified: Add the entries under the existing `## [Unreleased]` section
4. Write the updated file

## Tips

- Run `/mm:changelog` before bumping the version to capture what's new
- Run `/mm:changelog 0.59.0` as part of the release process
- The generated entries are a starting point — edit them to be more user-friendly if needed
