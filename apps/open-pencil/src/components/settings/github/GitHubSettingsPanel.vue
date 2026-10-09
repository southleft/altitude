<script setup lang="ts">
import { computed, ref, useId, useTemplateRef } from 'vue'

import {
  useCommonMessages,
  useI18n,
  useSettingsMessages,
  useStorageMessages
} from '@open-pencil/vue'

import { githubAutosaveEnabled } from '@/app/integrations/storage/github/autosave/preferences'
import { DESIGN_BRANCH_PREFIX } from '@/app/integrations/storage/github/branches/name'
import { githubFailureMessage } from '@/app/integrations/storage/github/failure-message'
import {
  GITHUB_APPLICATIONS_URL,
  GITHUB_TOKEN_SETTINGS_URL
} from '@/app/integrations/storage/github/provider'
import { useGitHubAccountSettings } from '@/app/integrations/storage/github/settings/account'
import { useGitHubRepositorySettings } from '@/app/integrations/storage/github/settings/repository'
import { useSettingsFormGuard } from '@/app/settings/navigation/use'
import { focusInvalidField } from '@/components/settings/layout/focus'
import SettingsDisclosure from '@/components/settings/layout/SettingsDisclosure.vue'
import SettingsGroup from '@/components/settings/layout/SettingsGroup.vue'
import SettingsLink from '@/components/settings/layout/SettingsLink.vue'
import SettingsPage from '@/components/settings/layout/SettingsPage.vue'
import SettingsSaveFeedback from '@/components/settings/layout/SettingsSaveFeedback.vue'
import SettingsSection from '@/components/settings/layout/SettingsSection.vue'
import ProviderSettingsField from '@/components/settings/provider/ProviderSettingsField.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppInput from '@/components/ui/input/AppInput.vue'
import AppActionRow from '@/components/ui/list/AppActionRow.vue'
import AppSwitch from '@/components/ui/toggle/AppSwitch.vue'

const storage = useStorageMessages()
const settings = useSettingsMessages()
const common = useCommonMessages()
const { locale } = useI18n()
const formID = useId()
const tokenDraft = ref('')
const account = useGitHubAccountSettings(tokenDraft)
const { identity, signedIn, operation: accountOperation, failure: accountFailure } = account
const tokenOpen = ref(!account.oauthAvailable)

const repositoryMessages = computed(() => ({
  requiredField: settings.value.requiredField,
  invalidName: storage.value.githubInvalidName,
  invalidBranch: storage.value.githubInvalidBranch,
  invalidFolder: storage.value.githubInvalidFolder
}))
const repository = useGitHubRepositorySettings(repositoryMessages)
const { drafts, dirty, busy, errors, saveResult, accessResult, error } = repository
const editing = ref(false)
const formElement = useTemplateRef<HTMLFormElement>('formElement')
useSettingsFormGuard({ dirty, busy, cancel }, editing)

const autosaveEnabled = githubAutosaveEnabled

/** `design/<document>/<login>`, the shape of every draft branch this account autosaves to. */
const draftBranchPattern = computed(() =>
  identity.value ? `${DESIGN_BRANCH_PREFIX}<document>/${identity.value.login.toLowerCase()}` : null
)

const accountFailureText = computed(() => {
  const failure = accountFailure.value
  if (!failure) return null
  if (failure.source === 'oauth') {
    return failure.reason === 'popup-blocked'
      ? storage.value.githubSignInBlocked
      : storage.value.githubSignInFailed
  }
  return githubFailureMessage(failure.kind, failure.resetAt, storage.value, locale.value)
})

const accessAlert = computed(() => {
  const result = accessResult.value
  if (!result) return null
  if (result.ok && result.canPush) {
    return {
      tone: 'success' as const,
      heading: storage.value.githubAccessGranted({ repository: result.repository })
    }
  }
  if (result.ok) return { tone: 'warning' as const, heading: storage.value.githubAccessReadOnly }
  return {
    tone: 'error' as const,
    heading: githubFailureMessage(result.kind, result.resetAt, storage.value, locale.value)
  }
})

const fields = computed(
  () =>
    [
      { id: 'owner', label: storage.value.githubOwner, hint: undefined },
      { id: 'repo', label: storage.value.githubRepositoryName, hint: undefined },
      { id: 'branch', label: storage.value.githubBranch, hint: undefined },
      { id: 'folder', label: storage.value.githubFolder, hint: storage.value.githubFolderHint }
    ] as const
)

function edit() {
  repository.begin()
  editing.value = true
}
function cancel() {
  repository.cancel()
  editing.value = false
}
async function save() {
  const result = await repository.save()
  if (result === 'invalid') await focusInvalidField(formElement.value)
  else if (result === 'saved') editing.value = false
}
async function testAccess() {
  if ((await repository.testAccess()) === 'invalid') await focusInvalidField(formElement.value)
}
</script>

<template>
  <SettingsPage data-test-id="settings-github-panel">
    <div class="flex flex-col gap-8">
      <SettingsSection>
        <template #title>{{ storage.githubAccount }}</template>
        <template #description>{{ storage.githubDescription }}</template>
        <div v-if="signedIn && identity" class="flex items-center gap-2">
          <img :src="identity.avatarURL" alt="" class="size-6 rounded-full" />
          <p class="min-w-0 flex-1 truncate text-xs text-surface">
            {{ storage.githubSignedInAs({ login: identity.login }) }}
          </p>
          <AppButton
            variant="outline"
            :loading="accountOperation === 'sign-out'"
            :disabled="accountOperation !== null"
            data-test-id="settings-github-sign-out"
            @click="account.signOut"
            >{{ storage.githubSignOut }}</AppButton
          >
        </div>
        <template v-else>
          <p class="text-[11px] text-muted">{{ storage.githubNotSignedIn }}</p>
          <div v-if="account.oauthAvailable" class="flex items-center gap-2">
            <AppButton
              color="primary"
              variant="solid"
              :loading="accountOperation === 'oauth'"
              :disabled="accountOperation !== null"
              data-test-id="settings-github-sign-in"
              @click="account.signIn"
            >
              <template #leading><icon-lucide-github aria-hidden="true" /></template>
              {{ accountOperation === 'oauth' ? storage.githubSigningIn : storage.githubSignIn }}
            </AppButton>
            <AppButton
              v-if="accountOperation === 'oauth'"
              variant="link"
              @click="account.cancelSignIn"
              >{{ common.cancel }}</AppButton
            >
          </div>
          <p v-else class="text-[11px] text-muted">{{ storage.githubOAuthUnavailable }}</p>
          <SettingsDisclosure v-model:open="tokenOpen">
            <template #label>{{ storage.githubUseToken }}</template>
            <form class="flex flex-col gap-3" novalidate @submit.prevent="account.connectToken">
              <ProviderSettingsField
                v-slot="{ control }"
                :label="storage.githubToken"
                :hint="storage.githubTokenHint"
              >
                <AppInput
                  v-bind="control"
                  v-model="tokenDraft"
                  type="password"
                  autocomplete="new-password"
                  :aria-label="storage.githubToken"
                  tone="panel"
                />
              </ProviderSettingsField>
              <SettingsLink :href="GITHUB_TOKEN_SETTINGS_URL">{{
                storage.githubCreateToken
              }}</SettingsLink>
              <AppButton
                type="submit"
                class="self-start"
                variant="outline"
                :loading="accountOperation === 'token'"
                :disabled="accountOperation !== null || !tokenDraft.trim()"
                data-test-id="settings-github-connect-token"
                >{{ storage.githubConnectToken }}</AppButton
              >
            </form>
          </SettingsDisclosure>
        </template>
        <AppAlert v-if="accountFailureText" tone="error" :heading="accountFailureText" />
        <p v-if="signedIn" class="text-[11px] text-muted">
          {{ storage.githubSignOutHint }}
          <SettingsLink :href="GITHUB_APPLICATIONS_URL">{{
            storage.githubAuthorizedApps
          }}</SettingsLink>
        </p>
      </SettingsSection>

      <SettingsSection>
        <template #title>{{ storage.githubAutosave }}</template>
        <template #description>{{ storage.githubAutosaveDescription }}</template>
        <SettingsGroup>
          <label class="flex items-center justify-between gap-4 px-3 py-2.5">
            <span class="min-w-0">
              <span class="block text-xs text-surface">{{ storage.githubAutosave }}</span>
              <span class="block text-[10px] break-words text-muted">{{
                draftBranchPattern
                  ? storage.githubAutosaveBranches({ pattern: draftBranchPattern })
                  : storage.githubAutosaveSignedOut
              }}</span>
            </span>
            <AppSwitch
              v-model="autosaveEnabled"
              :label="storage.githubAutosave"
              data-test-id="settings-github-autosave"
            />
          </label>
        </SettingsGroup>
      </SettingsSection>

      <SettingsSection v-if="!editing">
        <template #title>{{ storage.githubRepository }}</template>
        <template #description>{{ storage.githubRepositoryDescription }}</template>
        <AppActionRow data-test-id="settings-github-edit-repository" @click="edit">
          {{ drafts.owner }}/{{ drafts.repo }}
          <template #description>{{
            storage.githubWorkspaceDescription({
              repository: `${drafts.owner}/${drafts.repo}`,
              branch: drafts.branch,
              folder: drafts.folder || '/'
            })
          }}</template>
          <template #trailing
            >{{ settings.edit }}<icon-lucide-chevron-right class="size-3.5"
          /></template>
        </AppActionRow>
      </SettingsSection>
      <form
        v-else
        :id="formID"
        ref="formElement"
        novalidate
        :aria-busy="busy"
        @submit.prevent="save"
      >
        <SettingsSection>
          <template #title>{{ storage.githubRepository }}</template>
          <template #description>{{ settings.saveChangesDescription }}</template>
          <fieldset :disabled="busy" class="flex min-w-0 flex-col gap-4">
            <ProviderSettingsField
              v-for="field in fields"
              :key="field.id"
              v-slot="{ control }"
              :label="field.label"
              :hint="field.hint"
              :error="errors[field.id]"
              @blur="repository.blur(field.id)"
            >
              <AppInput
                v-bind="control"
                v-model="drafts[field.id]"
                :aria-label="field.label"
                autocomplete="off"
                tone="panel"
              />
            </ProviderSettingsField>
          </fieldset>
          <AppButton
            class="self-start"
            variant="outline"
            :loading="repository.operation.value === 'test'"
            :disabled="busy || !signedIn"
            data-test-id="settings-github-test"
            @click="testAccess"
          >
            <template #leading><icon-lucide-plug-zap aria-hidden="true" /></template>
            {{
              repository.operation.value === 'test'
                ? storage.githubTestingAccess
                : storage.githubTestAccess
            }}
          </AppButton>
          <AppAlert v-if="accessAlert" :tone="accessAlert.tone" :heading="accessAlert.heading" />
          <SettingsSaveFeedback :error="error" :result="saveResult" />
        </SettingsSection>
      </form>
    </div>
    <template v-if="editing" #footer>
      <AppButton :disabled="busy" @click="cancel">{{ common.cancel }}</AppButton>
      <AppButton
        type="submit"
        :form="formID"
        color="primary"
        variant="solid"
        :loading="repository.operation.value === 'save'"
        :disabled="busy"
        >{{ common.save }}</AppButton
      >
    </template>
  </SettingsPage>
</template>
