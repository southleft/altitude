<script setup lang="ts">
import { tryOnScopeDispose } from '@vueuse/core'
import { AlertDialogCancel, DialogClose } from 'reka-ui'
import { computed } from 'vue'

import { useI18n, useViewportKind } from '@open-pencil/vue'

import {
  settingsDialogOpen,
  registerSettingsNavigation,
  settingsDialogSection,
  type SettingsSection
} from '@/app/settings/dialog'
import { provideSettingsNavigation } from '@/app/settings/navigation/use'
import DiagnosticsSettingsPanel from '@/components/settings/diagnostics/DiagnosticsSettingsPanel.vue'
import GeneralSettingsPanel from '@/components/settings/general/GeneralSettingsPanel.vue'
import GitHubSettingsPanel from '@/components/settings/github/GitHubSettingsPanel.vue'
import SettingsPage from '@/components/settings/layout/SettingsPage.vue'
import MCPWorkspacePanel from '@/components/settings/mcp/MCPWorkspacePanel.vue'
import MediaSettingsPanel from '@/components/settings/media/MediaSettingsPanel.vue'
import StorageSettingsPanel from '@/components/settings/storage/StorageSettingsPanel.vue'
import ToolAccessSettingsPanel from '@/components/settings/tool-access/ToolAccessSettingsPanel.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import {
  AppAlertDialogRoot,
  AppDialogFooter,
  AppDialogHeader,
  AppDialogRoot
} from '@/components/ui/dialog'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import AppTabsContent from '@/components/ui/tabs/AppTabsContent.vue'
import AppTabsList from '@/components/ui/tabs/AppTabsList.vue'
import AppTabsRoot from '@/components/ui/tabs/AppTabsRoot.vue'
import AppTabsTrigger from '@/components/ui/tabs/AppTabsTrigger.vue'

const { isMobile } = useViewportKind()
const { settings, common, storage } = useI18n()
const navigation = provideSettingsNavigation()
tryOnScopeDispose(registerSettingsNavigation(navigation.request))
const { editing, confirming } = navigation
// Built-in AI sections (`ai`, `usage`) stay dormant: external agents connect over MCP instead.
const sections = computed(
  () =>
    [
      { value: 'general', label: settings.value.general },
      { value: 'diagnostics', label: settings.value.diagnostics },
      { value: 'mcp', label: settings.value.mcp },
      { value: 'tools', label: settings.value.toolAccess },
      { value: 'media', label: settings.value.media },
      { value: 'storage', label: settings.value.storage },
      { value: 'github', label: storage.value.githubSettings }
    ] satisfies { value: SettingsSection; label: string }[]
)
function onSectionChange(section: string | number): void {
  const match = sections.value.find((item) => item.value === section)
  if (!match || match.value === settingsDialogSection.value) return
  navigation.request(() => {
    settingsDialogSection.value = match.value
  })
}
function onOpenChange(open: boolean): void {
  if (open) settingsDialogOpen.value = true
  else
    navigation.request(() => {
      settingsDialogOpen.value = false
    })
}
</script>

<template>
  <AppDialogRoot
    :open="settingsDialogOpen"
    size="xl"
    :ui="{ content: 'w-[min(52.5rem,96vw)]' }"
    height="full"
    data-test-id="app-settings-dialog"
    @update:open="onOpenChange"
  >
    <AppDialogHeader
      :heading="settings.title"
      :description="settings.description"
      :close-label="common.close"
    />

    <AppTabsRoot
      :model-value="settingsDialogSection"
      @update:model-value="onSectionChange"
      :orientation="isMobile ? 'horizontal' : 'vertical'"
    >
      <div v-if="isMobile" class="shrink-0 border-b border-border p-3">
        <AppSelect
          :model-value="settingsDialogSection"
          :options="sections"
          :label="settings.title"
          :ui="{ trigger: 'w-full' }"
          @update:model-value="onSectionChange"
        />
      </div>
      <AppTabsList v-show="!isMobile" :label="settings.title">
        <AppTabsTrigger value="general" data-test-id="settings-section-general">
          <template #leading><icon-lucide-settings class="size-3.5" /></template>
          {{ settings.general }}
        </AppTabsTrigger>
        <AppTabsTrigger value="diagnostics" data-test-id="settings-section-diagnostics">
          <template #leading><icon-lucide-activity class="size-3.5" /></template>
          {{ settings.diagnostics }}
        </AppTabsTrigger>
        <AppTabsTrigger value="mcp" data-test-id="settings-section-mcp">
          <template #leading><icon-lucide-plug class="size-3.5" /></template>
          {{ settings.mcp }}
        </AppTabsTrigger>
        <AppTabsTrigger value="tools" data-test-id="settings-section-tools">
          <template #leading><icon-lucide-sliders-horizontal class="size-3.5" /></template>
          {{ settings.toolAccess }}
        </AppTabsTrigger>
        <AppTabsTrigger value="media" data-test-id="settings-section-media">
          <template #leading><icon-lucide-image class="size-3.5" /></template>
          {{ settings.media }}
        </AppTabsTrigger>
        <AppTabsTrigger value="storage" data-test-id="settings-section-storage">
          <template #leading><icon-lucide-cloud class="size-3.5" /></template>
          {{ settings.storage }}
        </AppTabsTrigger>
        <AppTabsTrigger value="github" data-test-id="settings-section-github">
          <template #leading><icon-lucide-git-branch class="size-3.5" /></template>
          {{ storage.githubSettings }}
        </AppTabsTrigger>
      </AppTabsList>

      <AppTabsContent value="general" as-child>
        <SettingsPage><GeneralSettingsPanel /></SettingsPage>
      </AppTabsContent>
      <AppTabsContent value="diagnostics" as-child>
        <SettingsPage><DiagnosticsSettingsPanel /></SettingsPage>
      </AppTabsContent>
      <AppTabsContent value="mcp" as-child>
        <MCPWorkspacePanel />
      </AppTabsContent>
      <AppTabsContent value="tools" as-child>
        <ToolAccessSettingsPanel />
      </AppTabsContent>
      <AppTabsContent value="media" as-child>
        <MediaSettingsPanel />
      </AppTabsContent>
      <AppTabsContent value="storage" as-child>
        <StorageSettingsPanel />
      </AppTabsContent>
      <AppTabsContent value="github" as-child>
        <GitHubSettingsPanel />
      </AppTabsContent>
    </AppTabsRoot>

    <AppDialogFooter v-if="!editing">
      <DialogClose as-child>
        <AppButton color="primary" variant="solid" data-test-id="app-settings-done">
          {{ common.done }}
        </AppButton>
      </DialogClose>
    </AppDialogFooter>
  </AppDialogRoot>
  <AppAlertDialogRoot :open="confirming" @update:open="!$event && navigation.keepEditing()">
    <AppDialogHeader
      :heading="settings.discardChanges"
      :description="settings.discardChangesDescription"
      :show-close="false"
    />
    <AppDialogFooter>
      <AlertDialogCancel as-child
        ><AppButton>{{ settings.keepEditing }}</AppButton></AlertDialogCancel
      >
      <AppButton color="error" variant="solid" @click="navigation.discard">{{
        settings.discard
      }}</AppButton>
    </AppDialogFooter>
  </AppAlertDialogRoot>
</template>
