/// <reference types="vite/client" />
import CanvasKitInit, { type CanvasKit } from 'canvaskit-wasm'

import { IS_BROWSER } from './constants'
import { filePathFromURL } from './io/file-url'
import { publicAssetURL } from './public-asset'

let instance: CanvasKit | null = null

export interface CanvasKitOptions {
  locateFile?: (file: string) => string
}

export async function getCanvasKit(options?: CanvasKitOptions): Promise<CanvasKit> {
  if (instance) return instance

  const defaultLocate = (file: string) => {
    if (!IS_BROWSER) {
      const ckPath = import.meta.resolve('canvaskit-wasm')
      return filePathFromURL(new URL(file, ckPath))
    }
    return publicAssetURL(file)
  }

  instance = await CanvasKitInit({
    locateFile: options?.locateFile ?? defaultLocate
  })

  return instance
}
