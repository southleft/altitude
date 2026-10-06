import { isPlainObject } from 'es-toolkit/predicate'

import type { NodeChange, PluginData } from '@open-pencil/kiwi/fig/codec'
import type {
  VariableCodeSyntax,
  VariableCodeSyntaxPlatform,
  VariableExtensions
} from '@open-pencil/scene-graph'

import { getOpenPencilPluginValue, OPEN_PENCIL_PLUGIN_ID } from './plugin-data'

/**
 * Variable and collection metadata in `.fig` files.
 *
 * `codeSyntax` is a native Figma field (VARIABLE `codeSyntax`, platforms WEB/ANDROID/iOS),
 * so Figma shows and keeps it. `extensions` has no Figma field; it travels as OpenPencil
 * plugin data, which Figma preserves without interpreting.
 */

export const VARIABLE_EXTENSIONS_PLUGIN_KEY = 'variableExtensions'

const PLATFORMS: readonly VariableCodeSyntaxPlatform[] = ['WEB', 'ANDROID', 'iOS']

interface VariableMetadataOwner {
  codeSyntax?: VariableCodeSyntax
  extensions?: VariableExtensions
}

export function variableMetadataToKiwi(owner: VariableMetadataOwner): Partial<NodeChange> {
  const fields: Partial<NodeChange> = {}
  const entries = PLATFORMS.flatMap((platform) => {
    const value = owner.codeSyntax?.[platform]
    return value ? [{ platform, value }] : []
  })
  if (entries.length) fields.codeSyntax = { entries }
  if (owner.extensions && Object.keys(owner.extensions).length) {
    const pluginData: PluginData[] = [
      {
        pluginID: OPEN_PENCIL_PLUGIN_ID,
        key: VARIABLE_EXTENSIONS_PLUGIN_KEY,
        value: JSON.stringify(owner.extensions)
      }
    ]
    fields.pluginData = pluginData
  }
  return fields
}

function readCodeSyntax(nc: NodeChange): VariableCodeSyntax | undefined {
  const map = nc.codeSyntax
  if (!isPlainObject(map) || !Array.isArray(map.entries)) return undefined
  const codeSyntax: VariableCodeSyntax = {}
  for (const entry of map.entries) {
    if (!isPlainObject(entry) || typeof entry.value !== 'string') continue
    const platform = PLATFORMS.find((candidate) => candidate === entry.platform)
    if (platform) codeSyntax[platform] = entry.value
  }
  return Object.keys(codeSyntax).length ? codeSyntax : undefined
}

function readExtensions(nc: NodeChange): VariableExtensions | undefined {
  const raw = getOpenPencilPluginValue(nc, VARIABLE_EXTENSIONS_PLUGIN_KEY)
  if (!raw) return undefined
  try {
    const parsed: unknown = JSON.parse(raw)
    return isPlainObject(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

export function variableMetadataFromKiwi(nc: NodeChange): VariableMetadataOwner {
  const metadata: VariableMetadataOwner = {}
  const codeSyntax = readCodeSyntax(nc)
  const extensions = readExtensions(nc)
  if (codeSyntax) metadata.codeSyntax = codeSyntax
  if (extensions) metadata.extensions = extensions
  return metadata
}
