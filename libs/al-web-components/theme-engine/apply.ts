/**
 * Preview-side applicator.
 *
 * Runs in the page that asked for the theme. Writes the derived tokens as
 * *inline* custom properties on <html>, which beats every `:root` rule in
 * `main.scss` without touching the cascade layers — inline styles outrank all
 * layered CSS.
 *
 * Custom properties pierce shadow boundaries, so every <al-*> component picks
 * the new values up automatically; no per-component work and no restyling of
 * adopted stylesheets.
 */

import type { ApplyPayload } from './types';

/** Keys written by the last apply, so the next one can diff-remove. */
let applied: string[] = [];

function targets(): HTMLElement[] {
  const out: HTMLElement[] = [document.documentElement];
  // Scoped <al-theme> hosts set tokens on :host, which would beat values
  // inherited from <html> for their subtree. Write to them too.
  document.querySelectorAll('al-theme').forEach((el) => out.push(el as HTMLElement));
  return out;
}

export function applyTheme(payload: ApplyPayload): void {
  const { palette, mode } = payload;
  const els = targets();

  for (const el of els) {
    // Diff-remove: without this, a key present in the previous theme but
    // absent from this one would linger and blend two palettes together.
    for (const key of applied) {
      if (!(key in palette)) el.style.removeProperty(key);
    }
    for (const key in palette) {
      const value = palette[key];
      // setProperty(k, undefined) writes the literal string "undefined" —
      // an invalid inline value that still beats every stylesheet.
      if (typeof value === 'string' && value) el.style.setProperty(key, value);
    }
  }

  applied = Object.keys(palette);
  document.documentElement.setAttribute('data-al-ai-theme', mode);
}

export function resetTheme(): void {
  for (const el of targets()) {
    for (const key of applied) el.style.removeProperty(key);
  }
  applied = [];
  document.documentElement.removeAttribute('data-al-ai-theme');
}
