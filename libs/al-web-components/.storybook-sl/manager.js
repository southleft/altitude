// Southleft Storybook manager (port 6007).
//
// Same UI as Altitude's — parity badges on every sidebar entry plus the
// one-click light/dark toggle — because it is the same code:
// `../.storybook/manager.shared.js`. Only the branding theme and the preset
// ids the toggle writes differ, which is exactly what that module takes as
// arguments.
//
// The badges here describe SOUTHLEFT parity: `./env.ts` sets `DS_PROJECT`, so
// the emitter writes `dist/parity.southleft.json` — the report for Figma file
// "Southleft V5" — alongside Altitude's untouched `dist/parity.json`. Both are
// served from the shared `../dist` staticDir; the filename is what selects.
import theme from './theme';
import { SOUTHLEFT_DARK_PRESET_ID, SOUTHLEFT_LIGHT_PRESET_ID } from '../.storybook/presets';
import { setupManager } from '../.storybook/manager.shared';

setupManager({
  theme,
  lightPresetId: SOUTHLEFT_LIGHT_PRESET_ID,
  darkPresetId: SOUTHLEFT_DARK_PRESET_ID,
  addonId: 'southleft/mode-toggle',
  parityUrl: './parity.southleft.json',
});
