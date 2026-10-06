import { ref } from 'vue'

import type { ColorFieldFormat } from '#vue/controls/color-model/types'
import {
  OKHCL_FIELD_OPTIONS,
  createOkHCLActions,
  createOkHCLFieldFormats,
  createOkHCLPreviewHelpers,
  getFillOkHCLColor,
  getStrokeOkHCLColor
} from '#vue/controls/okhcl/helpers'
import { useEditor } from '#vue/editor/context'

export function useOkHCL() {
  const editor = useEditor()
  const fieldFormats = ref(new Map<string, ColorFieldFormat>())

  const { ensureFillOkHCL, ensureStrokeOkHCL, updateFillOkHCL, updateStrokeOkHCL } =
    createOkHCLActions(editor)
  const { getFillPreviewInfo, getStrokePreviewInfo } = createOkHCLPreviewHelpers(editor)
  const { getFieldFormat, setFillFieldFormat, setStrokeFieldFormat } = createOkHCLFieldFormats(
    fieldFormats,
    ensureFillOkHCL,
    ensureStrokeOkHCL
  )

  return {
    getFillOkHCLColor,
    getStrokeOkHCLColor,
    getFillPreviewInfo,
    getStrokePreviewInfo,
    getFieldFormat,
    setFillFieldFormat,
    setStrokeFieldFormat,
    updateFillOkHCL,
    updateStrokeOkHCL,
    fieldOptions: OKHCL_FIELD_OPTIONS
  }
}
