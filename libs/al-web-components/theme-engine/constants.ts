/** Addon identity + the manager <-> preview channel contract. */

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
