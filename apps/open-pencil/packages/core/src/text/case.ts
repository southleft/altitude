import type { TextCase } from '@open-pencil/scene-graph'

export function transformTextCase(text: string, textCase: TextCase): string {
  if (textCase === 'UPPER') return text.toLocaleUpperCase()
  if (textCase === 'LOWER') return text.toLocaleLowerCase()
  if (textCase === 'TITLE') {
    return text.replace(
      /[\p{L}\p{N}][\p{L}\p{M}\p{N}]*/gu,
      (word) => word.charAt(0).toLocaleUpperCase() + word.slice(1).toLocaleLowerCase()
    )
  }
  return text
}
