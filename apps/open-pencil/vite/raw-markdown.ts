import type { Plugin } from 'vite'

export function rawMarkdownPlugin(): Plugin {
  return {
    name: 'raw-text-assets',
    transform(code: string, id: string) {
      if (id.endsWith('.md') || id.endsWith('.kiwi')) {
        return { code: `export default ${JSON.stringify(code)}`, map: null }
      }
    }
  }
}
