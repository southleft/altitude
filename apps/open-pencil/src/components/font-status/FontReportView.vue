<script setup lang="ts">
import { computed, ref } from 'vue'

import type { FontFaceSelector, FontReplacement } from '@open-pencil/core/editor'
import type {
  DocumentFontReport,
  FontReplacementSuggestion,
  FontReportFamily,
  FontReportOrigin
} from '@open-pencil/core/text'
import { useI18n } from '@open-pencil/vue'

import type { SanctionedFontPolicy } from '@/app/editor/fonts/policy'
import type { FontReplacementOutcome } from '@/app/editor/fonts/report/use'
import type { TeamFontLibraryStatus } from '@/app/editor/fonts/team/library'
import ExternalLink from '@/components/links/ExternalLink.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'

const {
  report,
  policy,
  teamStatus,
  folderHref,
  suggestionsFor,
  styles,
  replacing = false,
  outcome = null
} = defineProps<{
  report: DocumentFontReport
  policy: SanctionedFontPolicy
  teamStatus: TeamFontLibraryStatus
  /** Web URL of the team fonts folder. */
  folderHref: string
  suggestionsFor: (family: string) => FontReplacementSuggestion[]
  /** Styles offered for a replacement, such as `Regular` and `Bold`. */
  styles: readonly string[]
  replacing?: boolean
  outcome?: { family: string; result: FontReplacementOutcome } | null
}>()

const emit = defineEmits<{
  reveal: [nodeIds: string[]]
  replace: [from: FontFaceSelector, to: FontReplacement]
  refreshTeam: []
}>()

defineSlots<{
  /** Optional full family picker for the replacement, bound to the chosen family. */
  picker?: (props: { family: string; select: (family: string) => void }) => unknown
}>()

const { fonts } = useI18n()

const editing = ref<string | null>(null)
const chosenFamily = ref('')
/** `keep` keeps each use's weight and slant. */
const KEEP_STYLE = 'keep'
const chosenStyle = ref(KEEP_STYLE)
const styleOptions = computed(() => [
  { value: KEEP_STYLE, label: fonts.value.keepEachStyle },
  ...styles.map((style) => ({ value: style, label: style }))
])

const repository = computed(() => `${teamStatus.location.owner}/${teamStatus.location.repo}`)

const originLabels = computed<Record<FontReportOrigin, string>>(() => ({
  bundled: fonts.value.originBundled,
  local: fonts.value.originLocal,
  team: fonts.value.originTeam,
  web: fonts.value.originWeb,
  fallback: fonts.value.originFallback,
  document: fonts.value.originDocument,
  substituted: fonts.value.originSubstituted,
  missing: fonts.value.originMissing
}))

const teamMessage = computed(() => {
  const status = teamStatus
  const values = { repository: repository.value, count: String(status.faceCount) }
  switch (status.state) {
    case 'loading':
      return fonts.value.teamFontsLoading
    case 'ready':
      return fonts.value.teamFontsReady(values)
    case 'empty':
      return fonts.value.teamFontsEmpty(values)
    case 'signed-out':
      return fonts.value.teamFontsSignedOut
    case 'forbidden':
      return fonts.value.teamFontsForbidden(values)
    case 'rate-limited':
      return fonts.value.teamFontsRateLimited
    case 'offline':
      return fonts.value.teamFontsOffline
    default:
      return null
  }
})

const missingFamilies = computed(() => report.families.filter((family) => family.missing))
const suggestions = computed(() => (editing.value ? suggestionsFor(editing.value) : []))

function layerCount(count: number): string {
  return count === 1 ? fonts.value.layerCountOne : fonts.value.layerCount({ count: String(count) })
}

function familyNodeIds(family: FontReportFamily): string[] {
  return [...new Set(family.faces.flatMap((face) => face.nodeIds))]
}

function startReplace(family: FontReportFamily) {
  editing.value = family.family
  chosenFamily.value = suggestionsFor(family.family)[0]?.family ?? ''
  chosenStyle.value = KEEP_STYLE
}

function selectFamily(family: string) {
  chosenFamily.value = family
}

function submitReplace() {
  if (!editing.value || !chosenFamily.value) return
  emit(
    'replace',
    { family: editing.value },
    {
      family: chosenFamily.value,
      ...(chosenStyle.value === KEEP_STYLE ? {} : { style: chosenStyle.value })
    }
  )
  editing.value = null
}
</script>

<template>
  <div data-slot="font-report" class="grid gap-3 text-xs text-surface">
    <p class="text-muted">
      {{
        fonts.reportSummary({
          families: String(report.families.length),
          faces: String(report.faceCount),
          missing: String(report.missingFaceCount)
        })
      }}
    </p>

    <AppAlert
      v-if="outcome && outcome.result.status === 'replaced'"
      tone="success"
      :heading="fonts.replacedFont({ family: outcome.family, count: String(outcome.result.count) })"
    />
    <AppAlert
      v-else-if="outcome && outcome.result.status === 'unchanged'"
      tone="info"
      :heading="fonts.replaceUnchanged"
    />
    <AppAlert
      v-else-if="outcome && outcome.result.status === 'failed'"
      tone="error"
      :heading="fonts.replaceFailed"
    />

    <AppAlert
      v-for="family in missingFamilies"
      :key="`guidance:${family.family}`"
      tone="warning"
      :heading="fonts.missingFamilyHeading({ family: family.family })"
      :description="fonts.addToTeamFonts({ family: family.family, repository: repository })"
    >
      <template #details>{{ fonts.licenseNote }}</template>
      <template #actions>
        <ExternalLink :href="folderHref">{{ fonts.openFontsFolder }}</ExternalLink>
      </template>
    </AppAlert>

    <p v-if="report.families.length === 0" class="py-4 text-center text-muted">
      {{ fonts.reportEmpty }}
    </p>

    <ul v-else :aria-label="fonts.reportTitle" class="grid gap-2">
      <li
        v-for="family in report.families"
        :key="family.family"
        data-slot="font-report-family"
        :data-missing="family.missing ? '' : undefined"
        class="rounded border border-border p-2 data-[missing]:border-[var(--color-warning-border)]"
      >
        <div class="flex min-w-0 items-center gap-2">
          <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ family.family }}</span>
          <span
            v-if="family.sanctioned !== null"
            data-slot="font-report-sanctioned"
            :data-sanctioned="family.sanctioned ? 'yes' : 'no'"
            class="shrink-0 rounded px-1.5 py-0.5 text-[10px] data-[sanctioned=no]:bg-input data-[sanctioned=no]:text-muted data-[sanctioned=yes]:bg-accent/10 data-[sanctioned=yes]:text-accent"
          >
            {{
              family.sanctioned
                ? fonts.sanctioned({ system: policy.system })
                : fonts.notSanctioned({ system: policy.system })
            }}
          </span>
          <AppButton size="xs" variant="outline" @click="emit('reveal', familyNodeIds(family))">
            {{ fonts.showLayers }}
          </AppButton>
          <AppButton
            size="xs"
            variant="outline"
            :disabled="replacing"
            @click="startReplace(family)"
          >
            {{ fonts.replaceFont }}
          </AppButton>
        </div>

        <ul class="mt-1.5 grid gap-1">
          <li
            v-for="face in family.faces"
            :key="face.style"
            data-slot="font-report-face"
            class="flex min-w-0 items-center gap-2"
          >
            <span class="min-w-0 flex-1 truncate">{{ face.style }}</span>
            <span
              :data-origin="face.origin"
              class="shrink-0 rounded bg-input px-1.5 py-0.5 text-[10px] text-muted data-[origin=missing]:text-danger data-[origin=substituted]:text-[var(--color-warning-action)] data-[origin=team]:text-accent"
            >
              {{ originLabels[face.origin] }}
              <template v-if="face.substituteFamily"> → {{ face.substituteFamily }}</template>
            </span>
            <button
              type="button"
              class="shrink-0 text-[10px] text-muted underline-offset-2 hover:text-surface hover:underline"
              @click="emit('reveal', face.nodeIds)"
            >
              {{ layerCount(face.nodeIds.length) }}
            </button>
          </li>
        </ul>

        <form
          v-if="editing === family.family"
          data-slot="font-report-replace"
          class="mt-2 grid gap-2 rounded bg-input/50 p-2"
          @submit.prevent="submitReplace"
        >
          <p class="font-medium">{{ fonts.replaceFamilyHeading({ family: family.family }) }}</p>
          <div v-if="suggestions.length > 0" class="grid gap-1">
            <span class="text-muted">{{ fonts.replaceSuggestions }}</span>
            <div
              class="flex flex-wrap gap-1"
              role="radiogroup"
              :aria-label="fonts.replaceSuggestions"
            >
              <button
                v-for="suggestion in suggestions"
                :key="suggestion.family"
                type="button"
                role="radio"
                :aria-checked="chosenFamily === suggestion.family"
                :data-sanctioned="suggestion.sanctioned ? '' : undefined"
                class="rounded border border-border px-1.5 py-0.5 aria-checked:border-accent aria-checked:text-accent data-[sanctioned]:font-medium"
                @click="selectFamily(suggestion.family)"
              >
                {{ suggestion.family }}
              </button>
            </div>
          </div>
          <p v-else class="text-muted">{{ fonts.noSuggestions }}</p>
          <slot name="picker" :family="chosenFamily" :select="selectFamily" />
          <div class="flex items-center gap-2">
            <span class="text-muted">{{ fonts.replaceStyle }}</span>
            <AppSelect
              v-model="chosenStyle"
              class="min-w-0 flex-1"
              :label="fonts.replaceStyle"
              :options="styleOptions"
            />
          </div>
          <div class="flex justify-end gap-1">
            <AppButton size="xs" variant="ghost" type="button" @click="editing = null">
              {{ fonts.replaceCancel }}
            </AppButton>
            <AppButton
              size="xs"
              variant="solid"
              color="primary"
              type="submit"
              :disabled="!chosenFamily || replacing"
            >
              {{ fonts.replaceAction }}
            </AppButton>
          </div>
        </form>
      </li>
    </ul>

    <div class="flex items-center gap-2 border-t border-border pt-2 text-muted">
      <span class="min-w-0 flex-1">
        {{
          policy.origin === 'document'
            ? fonts.sanctionedFromDocument({ system: policy.system })
            : fonts.sanctionedFromPreset({ system: policy.system })
        }}
      </span>
    </div>
    <div v-if="teamMessage" class="flex items-center gap-2 text-muted" data-slot="font-report-team">
      <span class="min-w-0 flex-1">
        {{ teamMessage }}
        <template v-if="teamStatus.skipped.length > 0">
          {{ fonts.teamFontsSkipped({ count: String(teamStatus.skipped.length) }) }}
        </template>
      </span>
      <AppButton size="xs" variant="ghost" @click="emit('refreshTeam')">
        {{ fonts.refreshTeamFonts }}
      </AppButton>
    </div>
  </div>
</template>
