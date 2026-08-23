// Altitude Storybook manager (port 6006).
//
// The implementation — parity badges + the light/dark toggle — moved verbatim
// into `./manager.shared.js`, which the Southleft Storybook
// (`.storybook-sl/manager.js`, port 6007) runs too. This file supplies the two
// things that differ between them: the branding theme and the preset ids the
// toggle writes into `globals.alPreset`.
import theme from './theme';
import { DARK_PRESET_ID, LIGHT_PRESET_ID } from './presets';
import { setupManager } from './manager.shared';

setupManager({
  theme,
  lightPresetId: LIGHT_PRESET_ID,
  darkPresetId: DARK_PRESET_ID,
  addonId: 'altitude/mode-toggle',
});
