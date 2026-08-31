# Task G — Answer from the docs site's llms.txt / .md routes only (attempt {{ATTEMPT}})

**R9 scenario.** This task measures whether Altitude's AI-facing documentation
surface (the docs site's `llms.txt` family and per-component `.md` routes)
actually helps an agent answer correctly — as opposed to the repo-local
digests every other task in this harness uses.

**Rule: fetch-only, no local files.** Answer every question below using ONLY
these live URLs (fetch each one; do not `Read` any file in this repository,
and do not rely on prior knowledge of Altitude beyond what these pages say):

- {{LLMS_TXT_URL}}
- {{LLMS_TOKENS_URL}}
- {{LLMS_COMPONENTS_URL}}
- {{COMPONENTS_MD_URL}}

If a question cannot be answered from those four pages alone, say so in
`unanswerable` rather than guessing or falling back to training-data
knowledge of a typical design system.

## Questions

1. How many components does the `llms-components.txt` (or equivalent) route
   list?
2. Name two naming or structural CONVENTIONS the `llms.txt` route documents
   for how an AI agent should consume the design system (not component
   names — conventions, e.g. how tokens are named, how components are
   grouped).
3. Pick any ONE real component named on `components.md` and report the
   route/URL pattern you would fetch to get that component's full detail
   page, per what `llms.txt` documents.

Return strict JSON matching this shape:

```json
{
  "answers": [
    { "question": 1, "answer": "…", "citedUrl": "https://…" }
  ],
  "unanswerable": ["…"],
  "urlsFetched": ["https://…"],
  "fetchFailures": ["…"]
}
```

`citedUrl` MUST be one of the four URLs above (or a URL those pages
themselves link to) — do not cite a repo file path; this task is
specifically about the PUBLISHED docs surface, not the source tree.
