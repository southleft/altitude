# Find Style References (Monday Morning)

Internal helper used by /mm:proposal to select past proposals as style references when generating new proposals.

## Usage

This skill is not meant to be called directly by users. It is invoked by the /mm:proposal skill during proposal generation.

However, it can be called manually for debugging:

```
/mm:find-style-references [engagement-type]
```

---

## Selection Algorithm

Given an engagement type for a new proposal, select 2-3 past proposals to use as style references:

1. Read `.mm/proposals/proposals-index.md` to get the list of all proposals with metadata
2. If the index doesn't exist, scan `.mm/proposals/*/` folders and read frontmatter directly
3. Filter proposals by engagement type match:
   - Valid types: `greenfield-build`, `design-system`, `team-augmentation`, `audit-consulting`, `maintenance-retainer`, `migration`, `mvp`
4. Apply selection rules:
   - If 3+ matches by engagement type: select the 3 most recent
   - If 1-2 matches: use all matches, plus fill to 3 with the most recent proposals of any type
   - If 0 matches: use the 3 most recent proposals regardless of type
5. Prefer `accepted` status proposals over `draft` or `declined` (sort accepted first, then by date)
6. Return the file paths of the selected proposals

## Output

```
Style References Selected

  engagement type    {type}
  matched            {N} proposals by type, {N} fill

  references:
    1. {client} — {title} ({date}, {status})
       .mm/proposals/{folder}/proposal.md
    2. {client} — {title} ({date}, {status})
       .mm/proposals/{folder}/proposal.md
    3. {client} — {title} ({date}, {status})
       .mm/proposals/{folder}/proposal.md
```

## Privacy Rules

When these references are used during proposal generation:

1. Never mention other clients by name in the new proposal
2. Never copy scope descriptions verbatim — rephrase for the new client's context
3. Never state "based on similar work for [other client]"
4. Use past pricing as a calibration signal, not a copy source
5. Extract structural patterns (section flow, option presentation, bullet density, tone) not specific content

## Related Commands

- `/mm:proposal` — Uses this skill during generation
- `/mm:index-proposals` — Rebuilds the index this skill reads from
