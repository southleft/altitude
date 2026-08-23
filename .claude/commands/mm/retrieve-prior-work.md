# Retrieve Prior Work

Regenerate `prior-work.md` for an existing spec by re-running similarity retrieval against the current spec index.

## Usage

```
/mm:retrieve-prior-work [spec-folder]
```

If no `spec-folder` is provided, prompt the user to pick from `.mm/specs/`.

## Workflow

1. Validate the spec folder exists at `.mm/specs/{spec-folder}/`. If not, list available specs and ask the user to pick one.
2. Call `mcp__monday-morning__mm_retrieve_prior_work` with:
   - `project_path` — the project root absolute path
   - `spec_path` — the spec folder name (e.g. `2026-05-08-spec-retrieval`)
3. Report the result to the user:
   - `matched_count` — number of similar prior specs surfaced
   - `empty_reason` — present only when `matched_count === 0`; one of `no_completed_specs`, `below_threshold`, `index_missing`
   - `prior_work_path` — absolute path to the regenerated file
4. If the call returns `success: false`, surface the `error` field verbatim and stop.

## Idempotency

The output is content-stable: re-running on the same inputs produces a byte-identical file. The `generated_at` timestamp is preserved when the body is unchanged, so `git diff` stays clean unless the underlying matches change.

## When to use

- After a related spec ships — the index updates automatically (T1-2), but existing scaffolds keep their old `prior-work.md` until you regenerate.
- When the similarity threshold or `top_n` config changes in `.mm/config.json` and you want to re-pull prior work for a spec already in flight.
- When the index was rebuilt manually and you want fresh matches.

## Related

- Auto-trigger: `mm_create` (with `entity: "spec"`) runs the same retrieval automatically on new spec creation (R1).
- Index location: `.mm/index/specs.json`.
- Config: `.mm/config.json` under `spec_retrieval.similarity_threshold` and `spec_retrieval.top_n`.
