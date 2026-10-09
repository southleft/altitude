import * as v from 'valibot'

/**
 * Response shapes of the branch, pull request, issue and label endpoints. Only the fields
 * the editor reads are declared; GitHub's extra fields pass through unvalidated and unused.
 */

const AccountSchema = v.object({
  login: v.string(),
  avatar_url: v.string(),
  html_url: v.optional(v.string())
})

export const BranchSchema = v.object({
  name: v.string(),
  commit: v.object({ sha: v.string() }),
  protected: v.optional(v.boolean())
})

export const PullRequestSchema = v.object({
  number: v.number(),
  /** GraphQL id, needed for mutations REST does not offer (ready for review). */
  node_id: v.optional(v.string()),
  html_url: v.string(),
  state: v.picklist(['open', 'closed']),
  title: v.string(),
  body: v.nullish(v.string()),
  draft: v.optional(v.boolean()),
  merged_at: v.nullish(v.string()),
  head: v.object({ ref: v.string(), sha: v.string() }),
  base: v.object({ ref: v.string() }),
  user: v.nullish(AccountSchema)
})

export const ReviewSchema = v.object({
  state: v.string(),
  user: v.nullish(v.object({ login: v.string() })),
  submitted_at: v.nullish(v.string())
})

export const CompareSchema = v.object({
  status: v.string(),
  ahead_by: v.number(),
  behind_by: v.number(),
  files: v.optional(v.array(v.object({ filename: v.string(), status: v.string() })))
})

const LabelSchema = v.union([v.string(), v.object({ name: v.string() })])

export const IssueSchema = v.object({
  number: v.number(),
  html_url: v.string(),
  title: v.string(),
  body: v.nullish(v.string()),
  state: v.picklist(['open', 'closed']),
  user: v.nullish(AccountSchema),
  labels: v.optional(v.array(LabelSchema)),
  comments: v.optional(v.number()),
  created_at: v.string(),
  updated_at: v.string(),
  closed_at: v.nullish(v.string()),
  /** Present when the "issue" is a pull request; those are filtered out. */
  pull_request: v.optional(v.unknown())
})

export const IssueCommentSchema = v.object({
  id: v.number(),
  html_url: v.string(),
  body: v.nullish(v.string()),
  user: v.nullish(AccountSchema),
  created_at: v.string(),
  updated_at: v.string()
})

export const IssueSearchSchema = v.object({
  total_count: v.number(),
  incomplete_results: v.optional(v.boolean()),
  items: v.array(IssueSchema)
})

export const RepositoryLabelSchema = v.object({
  name: v.string(),
  color: v.optional(v.string())
})

export type GitHubAccount = v.InferOutput<typeof AccountSchema>
export type GitHubBranch = v.InferOutput<typeof BranchSchema>
export type GitHubPullRequest = v.InferOutput<typeof PullRequestSchema>
export type GitHubReview = v.InferOutput<typeof ReviewSchema>
export type GitHubComparison = v.InferOutput<typeof CompareSchema>
export type GitHubIssue = v.InferOutput<typeof IssueSchema>
export type GitHubIssueComment = v.InferOutput<typeof IssueCommentSchema>
export type GitHubIssueSearch = v.InferOutput<typeof IssueSearchSchema>

/** Label names of an issue, whichever form GitHub returned them in. */
export function issueLabelNames(issue: GitHubIssue): string[] {
  return (issue.labels ?? []).map((label) => (typeof label === 'string' ? label : label.name))
}
