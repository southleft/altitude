import { describe, expect, test } from 'bun:test'

import { publicAssetURL } from '#core/public-asset'

describe('publicAssetURL', () => {
  test('resolves from the root outside a Vite build', () => {
    expect(publicAssetURL('canvaskit.wasm')).toBe('/canvaskit.wasm')
    expect(publicAssetURL('/Inter-Regular.ttf')).toBe('/Inter-Regular.ttf')
  })
})
