import { useActiveElement } from '@vueuse/core'
import { computed } from 'vue'

import { useEditorCommands } from '@open-pencil/vue'

import { useEditorStore } from '@/app/editor/active-store'
import { createKeyboardActions } from '@/app/shell/keyboard/actions'
import { bindEditorClipboard } from '@/app/shell/keyboard/clipboard'
import { isInputElement } from '@/app/shell/keyboard/focus'
import { bindNudgeKeys } from '@/app/shell/keyboard/nudging'
import { registerKeyboardShortcuts } from '@/app/shell/keyboard/registry'
import { openFileDialog } from '@/app/shell/menu/use'
import { closeTab, createHomeTab, activeTab as activeTabRef } from '@/app/tabs'

export function useKeyboard() {
  const store = useEditorStore()
  const { runCommand, setOpacityTarget } = useEditorCommands()
  const activeElement = useActiveElement({ triggerOnRemoval: true })
  const inputFocused = computed(() => isInputElement(activeElement.value))

  const actions = createKeyboardActions({
    store,
    runCommand,
    setOpacityTarget
  })

  bindEditorClipboard(store)
  bindNudgeKeys(store)

  registerKeyboardShortcuts({
    inputFocused,
    store,
    runCommand,
    actions,
    openFileDialog: () => {
      void openFileDialog()
    },
    closeActiveTab: () => {
      if (activeTabRef.value) void closeTab(activeTabRef.value.id)
    },
    createTab: () => createHomeTab()
  })
}
