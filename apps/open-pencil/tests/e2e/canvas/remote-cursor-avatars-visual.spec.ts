import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

const editor = useEditorSetupWithClear('/?test&no-chrome&no-rulers')

test('remote cursor name pills draw GitHub avatars at a constant screen size', async () => {
  await editor.page.evaluate(async () => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    // A deterministic two-tone avatar, encoded in the page so no network is involved.
    const canvas = new OffscreenCanvas(32, 32)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('2D context unavailable')
    context.fillStyle = '#f5a623'
    context.fillRect(0, 0, 32, 32)
    context.fillStyle = '#1d3557'
    context.fillRect(0, 16, 32, 16)
    const bytes = new Uint8Array(
      await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer()
    )
    const purple = { r: 0.55, g: 0.3, b: 0.95, a: 1 }
    const green = { r: 0.1, g: 0.6, b: 0.4, a: 1 }
    store.state.remoteCursors = [
      { name: 'Octo Designer', color: purple, x: 120, y: 100, avatar: { key: 'octo', bytes } },
      { name: 'No avatar', color: green, x: 120, y: 200 },
      {
        name: 'Broken avatar',
        color: green,
        x: 120,
        y: 300,
        avatar: { key: 'bad', bytes: new Uint8Array([1, 2, 3]) }
      }
    ]
    store.requestRender()
  })
  await editor.canvas.waitForRender()
  editor.canvas.assertNoErrors()
  const buffer = await editor.canvas.screenshotCanvasRegion(400, 400)
  expect(buffer).toMatchSnapshot('remote-cursor-avatars.png', { maxDiffPixels: 24 })

  // Zooming moves the cursors but keeps the pill and avatar the same screen size.
  await editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    store.state.zoom = 2
    store.requestRender()
  })
  await editor.canvas.waitForRender()
  const zoomed = await editor.canvas.screenshotCanvasRegion(400, 700)
  expect(zoomed).toMatchSnapshot('remote-cursor-avatars-zoomed.png', { maxDiffPixels: 24 })
})
