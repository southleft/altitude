/**
 * `THEME_API` is the live one — every consumer of this engine POSTs there.
 *
 * The rest (`ADDON_ID`, `TOOL_ID`, `EVENTS`, `STORAGE_KEY`) are the identity
 * and manager<->preview channel contract of the Storybook addon panel that
 * originally drove this engine. That panel no longer exists, and nothing in
 * the repo reads these today, so `./index.ts` deliberately does NOT re-export
 * them — publishing them would advertise an API with no implementation behind
 * it. They are kept here, unexported from the barrel, because they are the
 * whole contract a future panel would need and re-deriving it is pure loss.
 */

export const ADDON_ID = 'altitude/ai-theme';
export const TOOL_ID = `${ADDON_ID}/tool`;

export const EVENTS = {
  /** manager -> preview: apply this palette. */
  APPLY: `${ADDON_ID}/apply`,
  /** manager -> preview: drop every override, back to brand. */
  RESET: `${ADDON_ID}/reset`,
} as const;

/** Where the AI endpoint lives. Same-origin in both dev and production. */
export const THEME_API = '/api/theme';

/** localStorage key holding the last derived theme, so a reload keeps it. */
export const STORAGE_KEY = 'al-ai-theme';
