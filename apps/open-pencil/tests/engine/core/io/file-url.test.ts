import { describe, expect, test } from 'bun:test'

import { filePathFromURL } from '#core/io/file-url'

describe('filePathFromURL', () => {
  test('drops the URL slash before a Windows drive letter', () => {
    expect(filePathFromURL(new URL('file:///D:/work/canvaskit.wasm'))).toBe(
      'D:/work/canvaskit.wasm'
    )
  })

  test('keeps POSIX paths and decodes escaped characters', () => {
    expect(filePathFromURL(new URL('file:///home/user/My%20Files/canvaskit.wasm'))).toBe(
      '/home/user/My Files/canvaskit.wasm'
    )
  })

  test('keeps the host of a UNC path', () => {
    expect(filePathFromURL(new URL('file://server/share/canvaskit.wasm'))).toBe(
      '//server/share/canvaskit.wasm'
    )
  })
})
