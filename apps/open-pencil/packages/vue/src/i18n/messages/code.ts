import { params } from '@nanostores/i18n'

import { i18n } from '#vue/i18n/create'

export const codeMessageDefaults = {
  source: 'Code source',
  sourceDesignJSX: 'Design JSX',
  sourceTailwindJSX: 'Tailwind JSX',
  sourceHTMLCSS: 'HTML/CSS',
  editorDesignLabel: 'Design JSX',
  editorHTMLCSSLabel: 'HTML and CSS',
  updating: 'Updating…',
  updatedLive: 'Updated live',
  /**
   * Shown when the panel has stopped following the canvas selection because the draft
   * has unsaved edits. Without it the panel reported "Updated live" — a success message —
   * while silently ignoring every layer the user clicked.
   */
  pinnedToEdit: 'Pinned to your edit — Reset to follow selection',
  /** Shown instead of freezing the editor while a huge subtree is serialised. */
  selectionTooLarge: params<{ count: number }>(
    'Selection too large to preview ({count}+ layers) — select a smaller frame'
  ),
  previewFailed: 'Preview failed',
  generatedReadOnly: 'Generated, read only',
  reset: 'Reset',
  copyJSXReference: 'Copy JSX prop reference to clipboard',
  jsxUpToDate: 'Up to date'
} as const

export const codeMessages = i18n('code', codeMessageDefaults)
