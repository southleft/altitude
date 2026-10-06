import { ref } from 'vue'

export type PropertiesPanelTab = 'design' | 'variables' | 'code'

/** The right panel's active tab, kept across document tabs and panel remounts. */
export const propertiesPanelTab = ref<PropertiesPanelTab>('design')
