import React from 'react';
import { addons, types, useGlobals } from 'storybook/manager-api';
import { IconButton } from 'storybook/internal/components';
import { MoonIcon, SunIcon } from '@storybook/icons';
import theme from './theme';
import { DARK_PRESET_ID, LIGHT_PRESET_ID } from '../../al-web-components/.storybook/presets';

const ADDON_ID = 'altitude/mode-toggle';
const TOOL_ID = `${ADDON_ID}/tool`;

addons.setConfig({
  theme: theme,
});

/**
 * Light / dark toggle — ported verbatim from
 * `@southleft/al-web-components/.storybook/manager.js` so the two Storybooks present the
 * same chrome. See that file for the full rationale (why a MANAGER tool rather
 * than a `globalTypes.toolbar` entry, why `React.createElement` over JSX).
 *
 * The preset ids come from the SAME `presets.ts` the decorator reads, imported
 * by relative path exactly like `preview.ts` / `with-preset.tsx` already do —
 * so the toggle and the dropdown it replaces cannot drift from the
 * web-components side.
 */
const ModeToggle = () => {
  const [globals, updateGlobals] = useGlobals();
  const isDark = globals.alPreset !== LIGHT_PRESET_ID;

  return React.createElement(
    IconButton,
    {
      key: TOOL_ID,
      active: false,
      title: isDark ? 'Switch to light mode' : 'Switch to dark mode',
      onClick: () => updateGlobals({ alPreset: isDark ? LIGHT_PRESET_ID : DARK_PRESET_ID }),
    },
    React.createElement(isDark ? MoonIcon : SunIcon),
  );
};

addons.register(ADDON_ID, () => {
  addons.add(TOOL_ID, {
    type: types.TOOL,
    title: 'Mode',
    // Hide on docs-only pages that render no story (Resources/*), where there
    // is nothing for the toggle to affect. Same match rule as the
    // web-components manager: the unattached Resources MDX pages all live
    // under `resources-`.
    match: ({ storyId }) => !String(storyId ?? '').startsWith('resources-'),
    render: ModeToggle,
  });
});
