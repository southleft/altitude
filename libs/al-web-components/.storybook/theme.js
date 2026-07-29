import { create } from 'storybook/theming/create';

/**
 * Altitude Storybook manager theme.
 *
 * This covers only what Storybook's ThemeVars contract actually exposes (31 keys).
 * Everything structural — sidebar geometry, section headers, count badges, the
 * dock — is done in `manager-head.html`, because ThemeVars has no sidebar
 * variables at all.
 *
 * Note: the manager chrome is deliberately dark-only and does NOT follow the
 * canvas preset. A preset retheming the preview must not restyle the tool.
 */
export const shell = {
  // Surfaces
  pageBg: '#17171A',
  panelBg: '#1C1C1F',
  canvasBg: '#141416',
  controlBg: '#232327',
  activeBg: '#232327',
  activeChildBg: '#2A2A30',

  // Lines
  border: '#262629',
  borderControl: '#2C2C31',
  borderControlStrong: '#34343A',

  // Ink
  text: '#E8E8EA',
  textStrong: '#EDEDF0',
  textIdle: '#B6B6BE',
  textMuted: '#8A8A92',
  textSecondary: '#9A9AA3',

  // Accent
  accent: '#4375FF',
  accentDeep: '#2D56CA',
  ok: '#3EE48C',

  // Type
  fontUi: "'Instrument Sans', system-ui, -apple-system, sans-serif",
  fontMono: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
};

export default create({
  base: 'dark',

  brandTitle: 'Altitude Design System',
  brandUrl: 'https://altitude.pages.dev/storybook/web-components',
  brandImage: './images/logo.svg',
  brandTarget: '_self',

  // Surfaces
  appBg: shell.panelBg,
  appContentBg: shell.canvasBg,
  appPreviewBg: shell.canvasBg,
  appHoverBg: shell.controlBg,
  appBorderColor: shell.border,
  appBorderRadius: 6,

  // colorSecondary drives selection + focus across the sidebar (31 usages),
  // so it is the single highest-leverage colour in the whole theme.
  colorPrimary: shell.accent,
  colorSecondary: shell.accent,

  // Ink
  textColor: shell.text,
  textInverseColor: shell.pageBg,
  textMutedColor: shell.textMuted,

  // Toolbar + panel tab strip
  barBg: shell.panelBg,
  barTextColor: shell.textSecondary,
  barHoverColor: shell.textStrong,
  barSelectedColor: shell.textStrong,

  // Controls
  inputBg: shell.controlBg,
  inputBorder: shell.borderControlStrong,
  inputTextColor: shell.textStrong,
  inputBorderRadius: 6,

  buttonBg: shell.controlBg,
  buttonBorder: shell.borderControlStrong,

  booleanBg: shell.controlBg,
  booleanSelectedBg: shell.borderControlStrong,

  fontBase: shell.fontUi,
  fontCode: shell.fontMono,
});
