import { tryOnScopeDispose } from '@vueuse/core'
import { isEqual } from 'es-toolkit'
import * as v from 'valibot'
import { computed, ref, type Ref } from 'vue'

import type { SettingsSaveResult } from '@/app/settings/save-result'
import { requiredSetting } from '@/app/settings/validation/schema'
import { useSettingsValidation } from '@/app/settings/validation/use'

import { validBranchName } from '../branches/name'
import type { GitHubErrorKind } from '../client'
import { describeGitHubFailure } from '../document/session'
import {
  readGitHubPreferences,
  writeGitHubPreferences,
  type GitHubPreferences
} from '../preferences'
import { resolveGitHubClient } from '../runtime'

export interface GitHubRepositoryMessages {
  requiredField: string
  invalidName: string
  invalidBranch: string
  invalidFolder: string
}

const NAME_PATTERN = /^[A-Za-z0-9._-]+$/

export function githubRepositorySchema(messages: GitHubRepositoryMessages) {
  return v.object({
    owner: v.pipe(
      requiredSetting(messages.requiredField),
      v.regex(NAME_PATTERN, messages.invalidName)
    ),
    repo: v.pipe(
      requiredSetting(messages.requiredField),
      v.regex(NAME_PATTERN, messages.invalidName)
    ),
    branch: v.pipe(
      requiredSetting(messages.requiredField),
      v.check(validBranchName, messages.invalidBranch)
    ),
    folder: v.pipe(
      v.string(),
      v.check(
        (folder) => !folder.split('/').some((part) => part.trim() === '..' || part.trim() === '.'),
        messages.invalidFolder
      )
    )
  })
}

export type GitHubAccessResult =
  | { ok: true; canPush: boolean; repository: string }
  | { ok: false; kind: GitHubErrorKind | 'unknown'; resetAt: Date | null }

export interface GitHubRepositorySettingsServices {
  read(): GitHubPreferences
  write(preferences: GitHubPreferences): void
  test(preferences: GitHubPreferences): Promise<GitHubAccessResult>
}

/** Check that the saved token can see the repository and branch, and whether it can push. */
export async function testGitHubRepositoryAccess(
  preferences: GitHubPreferences
): Promise<GitHubAccessResult> {
  try {
    const client = await resolveGitHubClient()
    const repository = await client.getRepository(preferences.owner, preferences.repo)
    await client.getBranchHead(preferences.owner, preferences.repo, preferences.branch)
    return {
      ok: true,
      canPush: repository.permissions?.push ?? false,
      repository: repository.full_name
    }
  } catch (error) {
    const failure = describeGitHubFailure(error)
    return { ok: false, kind: failure.kind, resetAt: failure.resetAt }
  }
}

const defaultServices: GitHubRepositorySettingsServices = {
  read: readGitHubPreferences,
  write: writeGitHubPreferences,
  test: testGitHubRepositoryAccess
}

/** Repository location form: validation in VeeValidate, persistence in preferences. */
export function useGitHubRepositorySettings(
  messages: Readonly<Ref<GitHubRepositoryMessages>>,
  services: GitHubRepositorySettingsServices = defaultServices
) {
  const drafts = ref<GitHubPreferences>(services.read())
  const initial = ref<GitHubPreferences>({ ...drafts.value })
  const operation = ref<'save' | 'test' | null>(null)
  const saveResult = ref<SettingsSaveResult | null>(null)
  const accessResult = ref<GitHubAccessResult | null>(null)
  const error = ref('')
  const dirty = computed(() => !isEqual(drafts.value, initial.value))
  const values = computed(() => ({ ...drafts.value }))
  const schema = computed(() => githubRepositorySchema(messages.value))
  const validation = useSettingsValidation(values, schema)
  let version = 0
  let disposed = false
  // A function, so checks after an await are not narrowed away by earlier ones.
  const isDisposed = () => disposed
  tryOnScopeDispose(() => {
    disposed = true
    version++
  })

  function begin() {
    version++
    drafts.value = services.read()
    initial.value = { ...drafts.value }
    saveResult.value = null
    accessResult.value = null
    error.value = ''
    validation.reset()
  }

  async function save(): Promise<SettingsSaveResult | 'invalid'> {
    if (operation.value || isDisposed()) return 'failed'
    if (!(await validation.validate())) return 'invalid'
    operation.value = 'save'
    try {
      services.write({ ...drafts.value })
      begin()
      saveResult.value = 'saved'
      return 'saved'
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause)
      saveResult.value = 'failed'
      return 'failed'
    } finally {
      operation.value = null
    }
  }

  async function testAccess(): Promise<GitHubAccessResult | 'invalid' | null> {
    if (operation.value || isDisposed()) return null
    if (!(await validation.validate())) return 'invalid'
    operation.value = 'test'
    accessResult.value = null
    const request = version
    try {
      const result = await services.test({ ...drafts.value })
      if (isDisposed() || request !== version) return null
      accessResult.value = result
      return result
    } finally {
      operation.value = null
    }
  }

  return {
    drafts,
    dirty,
    operation,
    busy: computed(() => operation.value !== null),
    errors: validation.errors,
    blur: validation.blur,
    saveResult,
    accessResult,
    error,
    begin,
    cancel: begin,
    save,
    testAccess
  }
}
