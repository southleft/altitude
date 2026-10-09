import { fontFamiliesFromVariables } from '@open-pencil/core/text'
import type { SceneGraph, Variable } from '@open-pencil/scene-graph'

/**
 * Which font families a design system sanctions. The app knows Altitude; core only takes a
 * list of families, so other systems can plug in their own policy.
 */
export interface SanctionedFontPolicy {
  /** Design system name shown in the report, such as `Altitude`. */
  system: string
  families: string[]
  /** `document`: read from the document's typography variables; `preset`: the built-in list. */
  origin: 'document' | 'preset'
}

/**
 * Altitude's `font-family` tokens (`libs/al-web-components/styles/tokens-dtcg/tier-1/
 * typography.json`), first family of each stack. Used when a document has not imported
 * the Altitude typography variables.
 */
export const ALTITUDE_FONT_FAMILIES: readonly string[] = [
  'Public Sans',
  'IBM Plex Sans',
  'Agrandir',
  'Georgia',
  'IBM Plex Mono',
  'Archivo',
  'Space Grotesk',
  'DM Sans',
  'Sora'
]

/** Imported Altitude tokens name font families `typography/font-family/<role>`. */
export function isFontFamilyVariable(variable: Variable): boolean {
  return /(^|[/.\s])font[-_ ]?family([/.\s]|$)/i.test(variable.name)
}

export function altitudeFontPolicy(graph: SceneGraph): SanctionedFontPolicy {
  const fromDocument = fontFamiliesFromVariables(graph, isFontFamilyVariable)
  return fromDocument.length > 0
    ? { system: 'Altitude', families: fromDocument, origin: 'document' }
    : { system: 'Altitude', families: [...ALTITUDE_FONT_FAMILIES], origin: 'preset' }
}
