# Altitude audit — 8 September 2026

**Verdict: advanced engineering foundations, incomplete design-to-code reliability.** Altitude is much more capable than “machines can’t read it yet” suggests. It has generated contracts, semantic tokens, a usage validator, MCP tools, React wrappers, real browser accessibility checks, and explicit drift reporting. Those are strong foundations. I would not yet call the whole system state of the art: the live Figma kit, generated examples, public API documentation, and verification evidence still disagree in consequential places.

This is a completion-and-quality problem more than an architectural rebuild. The next investment should make existing promises true and testable. Adding another generator or another aggregate score would do less than fixing the specific gaps below.

## Scope and evidence

- Audited the current working tree at HEAD `b494a52f`, including the user's existing uncommitted updates. No component source or Figma content was changed by this audit.
- Read the supplied September 4 audit, repo guardrails/workflows, and the `altitude-figma-sync` skill.
- Connected to Figma Desktop Bridge, pinned the project from `.altitude/ds-projects.json`, and asserted both file name and file key inside the plugin sandbox before reads. Live snapshot: **2026-09-08T14:30:06.413Z**.
- Inventoried **42 component sets, 7 standalone components, 387 variables, and 74 styles**. The inventory includes helpers and scratch sets; those are not 49 production components. There are **34 sets on canonical `🛠` pages**, all described and linked.
- Exported and visually inspected representative Figma states: Button, Input, Checkbox, Toggle, Accordion, and Combobox. Inspected browser screenshots of Input, Checkbox, Toggle, and Combobox. These are qualitative samples, not a pixel-parity or all-variant contrast certification.
- Rebuilt the story fixture from source and ran axe over **500 stories / 67 components**. Saved the report separately from the committed accessibility report.
- Ran `pnpm verify`: **33 passes, 6 failures, 0 skips within the fast tier**. This does not mean the build/live tiers ran. Did not run the full unit suite, Linux visual regression suite, manual screen-reader testing, or an AI agent fleet.
- Checked all **36 distinct component documentation links** retrieved from Figma. Checked the deployed `/docs/llms.txt` response for actual plain-text delivery.

Raw evidence: [Figma snapshot](figma-live.json), [fresh axe report](a11y-current.json), [gate log](verify.log), [documentation link checks](docs-links.json), and the PNGs beside this report. The audit scripts are saved here to make the observations reproducible.

## What changed since the supplied audit

The denominators changed, so percentages below are not a like-for-like score delta.

| Dimension | Supplied September 4 audit | Fresh observation | Conclusion |
|---|---|---|---|
| Component descriptions | 2/48 top-level components | 36/42 sets, plus 1/7 standalone components | Major improvement; all 34 canonical-page sets now described |
| Documentation links | 2/48 | 36/42 sets; 34 of 36 distinct URLs return 200 | Canonical links improved; two Playground links still return 404 |
| Dev Mode annotations | 0/48 | No annotations on any inventoried set/component or their descendants | Still absent; descriptions contain some accessibility information, so absence of annotations is not absence of all a11y metadata |
| Variable descriptions | 29/387 | 29/387 | Unchanged: 358 blank |
| Style descriptions | 0/66 | 8/74 | Eight newer styles documented; 66 remain blank |
| Duration/easing variables | None | No duration, easing, or timing variables found | Still a Figma gap; code already has animation-duration/timing tokens |
| Exposed icon/slot controls | Very sparse | Only Link has an INSTANCE_SWAP; four sets have BOOLEAN or INSTANCE_SWAP props | Canonical Button still has no non-variant properties; canonical Input also lacks them |
| Focus visibility | “12 Focus variants draw no indicator” | Sampled Input, Checkbox, Toggle render visible focus treatments | Do not repeat the old total without remeasurement |
| Duplicate names | Badge, Input, Input Stepper, Pagination | All four duplicate names still present | Promotion/retirement work remains |
| Combobox | Standalone component only | New two-variant set plus original standalone component | Progress, but both copies remain and the new set is still incomplete |
| Text Passage | Old single-axis component | Live replacement named Text Block | Improved; an older extracted canvas artifact still causes a convention-check failure |

## Findings, in priority order

### 1. High — generated examples sometimes lose the meaning of the selected variant

This is more dangerous than a blank description because a plausible snippet looks authoritative.

- **Tab, `Active=Yes`**: the live variant description emits `<al-tab>Label</al-tab>` and calls `Active=Yes` “an interaction state, not an attribute.” The source exposes `isActive` and uses it for selected state and tab order (`tab.ts:26,123–125`). The example does not reproduce the selected tab.
- **Combobox, `Label=Hidden`**: the live description emits `<al-combobox></al-combobox>` and calls label visibility an interaction state. The code exposes `hideLabel` (`combobox.ts:105`). The exported Hidden variant also visibly contains “Label.” This is both a mapping defect and a design-state discrepancy.
- Some semantic axes are mapped correctly: Badge's Dot example includes `isDot="true"`. The problem is incomplete classification, not a total failure of generation.

**Next action:** distinguish transient browser states from persistent component props in the snippet generator. Validate the emitted markup, then assert that each mapped variant actually sets the relevant property. Mark genuinely unmapped axes as unsupported instead of describing them as transient states. Verify rendered output for the selected/hidden cases.

### 2. High — the public contract still promises nonexistent slots

Fresh `gate:cem-render` output reports **5 documented-but-absent slots**, plus **18 rendered-but-undocumented slots**. It passes because five defects are the accepted baseline.

The absent slots are Avatar `badge`, Calendar `before` and `after`, Card `action-right`, and Theme Switcher's default slot. Card is particularly consequential: `card.ts:12` advertises `action-right`, but its template does not render that slot. The repo's agent instructions teach the same usage, so an agent following them can produce disappearing content.

**Next action:** resolve intended API in source/JSDoc, regenerate downstream contracts, and reduce the baseline to zero. Treat “no new defects” separately from “correct public API.” Generated artifacts multiply errors in their source of truth.

### 3. High — the canonical Figma library still lacks major product components

The live inventory contains no Card, Dialog, Drawer, Select, Popover, or Tooltip set. Accordion, Alert, and Avatar remain on Playground. Chip Group remains there even though the current system removed that component. The old Chip Group and Playground Pagination links return 404.

The saved parity manifest is not a reliable library-completeness score: it reports **4 in-sync, 2 code-drift, 20 figma-drift, 9 conflict, 65 missing-in-figma, 4 excluded**, using a September 6 observation plus current code. Its missing count includes deprecated icon elements and unmapped existing sets. For example, Alert and Avatar exist live but are unmapped. It would be wrong to tell you “65 visual components are missing.”

**Next action:** reconcile live identity and supported scope first; then finish Card, Dialog, Select and overlays based on product usage. Promote proven scratch improvements while preserving instance identity. Retire unsupported forks and removed components deliberately. Completion requires visual and interaction evidence, not just a populated node tree.

### 4. High — accessibility testing is useful, but conformance is not demonstrated

The new sweep reproduces **zero structural axe violations, zero story errors, and contrast findings on 16 components**. `componentsClean=67` means structural cleanliness; contrast is reported separately and excluded from the gate. The configured tags cover WCAG 2.0/2.1 A/AA, not a comprehensive WCAG 2.2 evaluation.

Most contrast findings occur in Disabled stories. I specifically rechecked List's `WithLinks` and `WithStatic` findings: both target a disabled list item, with axe reporting 3.49:1. These are **not established failures on enabled controls**. Inactive controls can qualify for the WCAG contrast exception; helper/error text needs contextual review. Do not turn all 16 into a blanket color-remediation backlog. [W3C contrast guidance](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum/).

The committed manual-test store has **zero records**. That means no recorded keyboard or screen-reader verification in that store, not proof nobody ever tested the system. The coverage floor is **29.35% statements/lines**, a historical floor rather than a fresh coverage measurement.

**Next action:** record browser/assistive-technology results for the five pilots, then complex composites. Include focus entry/return, dismissal, selection announcements, disabled semantics, zoom/reflow, forced colors, reduced motion and RTL workflows. Triage contrast by target and applicability, then gate actionable regressions. Carbon's component accessibility documentation provides a useful model for separating automated checks and manual screen-reader evidence. [Carbon accessibility](https://carbondesignsystem.com/components/text-input/accessibility/).

### 5. Medium — token and behavior knowledge has not fully reached Figma

Live Figma still has **358 undocumented variables**, **66 undocumented styles**, no duration/easing/timing variables, and no Dev Mode annotations. Several descriptions have an Accessibility heading containing only the root element, which does not explain keyboard behavior, focus ownership or announcements.

Code already contains animation tokens and a reduced-motion treatment. Adding a second motion vocabulary is unnecessary. Also, 608 emitted CSS tokens versus 387 Figma variables does **not** prove 221 missing variables: their representation, aliases and scope differ. This audit did not complete a value-by-value, mode-aware token diff.

**Next action:** derive descriptions from semantic intent, sync supported motion values using documented units, and describe behavior from reviewed implementations. Keep nonrepresentable values in structured documentation. Annotations can complement descriptions, but useful, accurate retrieval matters more than duplicating prose in every field.

### 6. Medium — property ergonomics and vocabulary remain uneven

Canonical Button has **120 variants and zero non-variant properties**. Its slots are now documented, but the designer still cannot configure them through slot booleans or icon swaps. Canonical Input lacks the controls already present on its pilot fork. Tab still has both `State=Active` and `Active=Yes/No`. Toggle Button and Breadcrumbs Item still lack a Focus option.

The code vocabulary ratchet measures **75 accepted violations**: 44 boolean names, 26 reserved-name uses, 3 axis-value issues and 2 spelling collisions. It passes because the count has not risen.

**Next action:** complete the common authoring controls and map Figma terminology explicitly to code. Normalize APIs through compatible migrations rather than a broad breaking rename. Do not create meaningless loading/error variants for components that do not own those states.

### 7. Medium — the verification and Code Connect work is unfinished

The fast-tier run failed six gates:

| Gate | Fresh result and interpretation |
|---|---|
| `check:code-connect` | 15 generated files differ from current contracts; current edits have not propagated through the chain |
| `check:context-budget` | Figma generation read path is 15,907 words against a 15,515-word pin |
| `check:figma-conventions` | Older canvas extraction says Text Passage, current mapping says Text Block; live inventory confirms Text Block exists, so this is stale evidence rather than proof the current name is wrong |
| `evals:traps:check` | Four new skill traps lack lifecycle entries |
| `gate:self-test` | Five positive-control scenarios fail; cause not established by this audit, and Windows/environment behavior needs investigation |
| `test:scripts` | Includes a failure on the same context-budget mismatch; not six independent product defects |

Lint, style lint, token metadata, contract schema validation, wrapper contracts and other fast checks passed. The failing working tree includes existing WIP, so this is not a claim about the last released package or CI on main.

Code Connect's checked-in report covers **34/102 contracts**; its other 68 include nonvisual/deprecated surfaces and should not all be counted as missing UI. The repo documents that publishing has not been exercised; this audit did not establish a live published connection. Generated files are preparation, not proof of a working Dev Mode integration. [Figma publishing workflow](https://developers.figma.com/docs/code-connect/quickstart-guide/).

### 8. Medium — AI readiness has infrastructure, but not a current outcome benchmark

The checked-in baseline scorecard is dated August 29, covers nine attempts for tasks D/E/F under one treatment/model, and is **unjudged**, with a null overall score. This is useful partial evidence, not proof of production composition quality or that MCP improves outcomes.

The deployed `/docs/llms.txt` returns 200 with `text/plain`, and the canonical Button documentation link returns the correct page. The delivery surface works in these spot checks.

**Next action:** run representative consuming tasks against the published surface: form validation, selected tabs, a modal with correct focus return, a card action menu, and a responsive page. Measure valid API usage, visual fidelity, accessible behavior, manual corrections and task time. Compare treatments using the same tasks. Do not substitute metadata-fill percentage for successful usage.

## Where the original audit misses the mark

Its central observation about empty Figma metadata was useful, and several remaining gaps are real. Its broader score is not a defensible measure of the whole design system.

1. **A universal seven-state denominator is inappropriate.** Tabs containers, labels and fieldsets do not all need default/hover/focus/disabled/error/active/loading variants. State obligations should come from semantics and supported behavior.
2. **Visual bounds are not necessarily hit-target bounds.** A small checkbox glyph or inline link does not automatically fail WCAG 2.5.8. Spacing, labels, actual clickable area and explicit exceptions matter. [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
3. **Focus indicators must be inspected through the full rendered subtree.** Current exported Input, Checkbox and Toggle states contradict a blanket claim that those focus variants draw nothing. This does not prove every current focus variant passes contrast or that the September 4 file was identical.
4. **The sample proposed documentation invents facts.** It introduces a 150ms motion token and claims an 8:1 ring against all backgrounds without a demonstrated theme matrix. Keyboard and disabled behavior must be verified, not inferred from ARIA-bearing file counts.
5. **Descriptions are not accessibility certification.** Presence of ARIA attributes does not establish a correct focus or screen-reader model. Transcription still requires behavioral review.
6. **The code-coverage backlog is stale.** Removed group/layout wrappers should not return to the roadmap. Banner, Empty State, Table and Combobox have current code counterparts. Distinct Tier 1 collections are not inherently a defect; nor is the choice of `danger` over `error`.
7. **The “5% machine readable” headline only measured selected Figma fields.** It does not account for the current CEM/schema/validator/MCP/docs surfaces. Conversely, filling those Figma fields does not prove that generated examples work.

## How far from state of the art?

There is no standardized “state of the art DS” percentage. My assessment is **technically ambitious and well-equipped, but not consistently finished enough to be a reference-quality system yet**.

| Dimension | Assessment | What would demonstrate the next level |
|---|---|---|
| Token and component architecture | Strong foundation | Reliable brand/mode behavior and published compatibility guarantees, verified from built outputs |
| Machine consumption | Advanced infrastructure, uneven truthfulness | Correct variant-to-code mappings and successful measured consumer tasks |
| Figma authoring | Behind the code | Core components complete, canonical identity clear, usable slot/icon controls, reviewed responsive behavior |
| Accessibility | Good automation foundation, incomplete assurance | Recorded assistive-technology and interaction testing; exception-aware contrast and WCAG 2.2 coverage |
| Internationalization and resilience | Partial evidence | Real multilingual/RTL, text expansion, forced-colors and zoom flows; existing direction tests alone are narrower |
| Governance | Strong mechanisms, unresolved accepted debt | Zero false public API promises, fresh artifacts, exercised release/Code Connect paths, ratchets actually tightened |
| Adoption and product value | Not established by this audit | Evidence from consuming teams: coverage of actual tasks, contribution/release turnaround, defects and time saved |

Compared with established systems, the missing work is less about inventing infrastructure and more about dependable coverage and operating evidence. Atlassian's semantic-token model is a useful foundation benchmark; Carbon's component-specific testing evidence is a useful assurance benchmark. These are reference practices, not claims that I benchmarked every feature of either system. [Atlassian tokens](https://atlassian.design/tokens/design-tokens), [Carbon accessibility](https://carbondesignsystem.com/components/text-input/accessibility/).

## Recommended next sequence

1. **Make the current contracts truthful.** Fix the five phantom slots and incorrect persistent-state mappings; regenerate and verify downstream examples.
2. **Close the canonical library loop.** Reconcile identities and retire stale forks; finish the high-use missing Figma components; expose useful text/slot/icon controls.
3. **Prove the five pilots end to end.** Browser, Figma, snippet, keyboard and screen reader should agree. Record evidence, then extend to composites.
4. **Finish delivery and evidence.** Fresh canvas observations, green applicable gates, a published and exercised Code Connect path, reviewed token/behavior metadata.
5. **Measure product use.** Run representative agent and human workflows through the published DS, and use actual failures to choose the next components or patterns.

I would not assign a calendar estimate until the intended supported component roster and manual-test matrix are agreed. This looks like several focused completion workstreams, not a reason to rebuild Altitude.
