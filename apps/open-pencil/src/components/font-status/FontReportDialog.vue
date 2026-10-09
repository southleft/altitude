<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { FontFaceSelector, FontReplacement } from '@open-pencil/core/editor'
import { FONT_WEIGHT_NAMES, weightToStyle } from '@open-pencil/core/text'
import { useI18n } from '@open-pencil/vue'

import { fontReportOpen } from '@/app/editor/fonts/report/open'
import { useDocumentFontReport, type FontReplacementOutcome } from '@/app/editor/fonts/report/use'
import { refreshTeamFonts, teamFontsRepositoryURL } from '@/app/editor/fonts/team'
import FontPicker from '@/components/font-picker/FontPicker.vue'
import FontReportView from '@/components/font-status/FontReportView.vue'
import { AppDialogBody, AppDialogHeader, AppDialogRoot } from '@/components/ui/dialog'

const { fonts, common } = useI18n()
const { report, policy, teamFontStatus, replacing, suggestionsFor, replace, revealLayers } =
  useDocumentFontReport(fontReportOpen)
const outcome = ref<{ family: string; result: FontReplacementOutcome } | null>(null)
const styles = Object.keys(FONT_WEIGHT_NAMES).flatMap((weight) => [
  weightToStyle(Number(weight)),
  weightToStyle(Number(weight), true)
])
const repositoryURL = computed(() => {
  void teamFontStatus.value
  return teamFontsRepositoryURL()
})

watch(fontReportOpen, (open) => {
  if (!open) outcome.value = null
})

async function onReplace(from: FontFaceSelector, to: FontReplacement) {
  const result = await replace(from, to)
  outcome.value = { family: from.family, result }
}

async function onReveal(nodeIds: string[]) {
  if (await revealLayers(nodeIds)) fontReportOpen.value = false
}
</script>

<template>
  <AppDialogRoot v-model:open="fontReportOpen" size="md" data-test-id="font-report-dialog">
    <AppDialogHeader :heading="fonts.reportTitle" :close-label="common.close" />
    <AppDialogBody>
      <FontReportView
        :report="report"
        :policy="policy"
        :team-status="teamFontStatus"
        :folder-href="repositoryURL"
        :suggestions-for="suggestionsFor"
        :styles="styles"
        :replacing="replacing"
        :outcome="outcome"
        @reveal="onReveal"
        @replace="onReplace"
        @refresh-team="refreshTeamFonts"
      >
        <template #picker="{ family, select }">
          <FontPicker :model-value="family" :label="fonts.replaceWith" @select="select" />
        </template>
      </FontReportView>
    </AppDialogBody>
  </AppDialogRoot>
</template>
