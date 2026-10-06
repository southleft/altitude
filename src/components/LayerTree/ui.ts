import { type ComputedRef, type InjectionKey, computed, inject, provide } from 'vue'

import type { ComponentUI } from '@/components/ui/types'
import type { LayerTreeTheme } from '@/theme/layer-tree'

export type LayerTreeUI = ComponentUI<LayerTreeTheme>

const LAYER_TREE_UI_KEY: InjectionKey<ComputedRef<LayerTreeUI | undefined>> =
  Symbol('layer-tree-ui')

export function provideLayerTreeUI(ui: () => LayerTreeUI | undefined) {
  provide(LAYER_TREE_UI_KEY, computed(ui))
}

export function useLayerTreeUI(): ComputedRef<LayerTreeUI | undefined> {
  return inject(
    LAYER_TREE_UI_KEY,
    computed(() => undefined)
  )
}
