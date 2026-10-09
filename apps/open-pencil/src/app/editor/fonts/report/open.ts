import { ref } from 'vue'

/** Whether the document font report dialog is open; one editor is active at a time. */
export const fontReportOpen = ref(false)

export function openFontReport(): void {
  fontReportOpen.value = true
}
