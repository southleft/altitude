import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'

import {
  suggestFontReplacements,
  type DocumentFontReport,
  type FontReportFamily
} from '@open-pencil/core/text'

import type { SanctionedFontPolicy } from '@/app/editor/fonts/policy'
import type { TeamFontLibraryStatus } from '@/app/editor/fonts/team/library'

import FontReportView from './FontReportView.vue'

const location = { owner: 'southleft', repo: 'altitude-designs', branch: 'main' }
const FOLDER = 'https://github.com/southleft/altitude-designs/tree/main/fonts'

function family(
  name: string,
  faces: Array<
    [style: string, origin: FontReportFamily['faces'][number]['origin'], layers: number]
  >,
  sanctioned: boolean | null
): FontReportFamily {
  let next = 0
  const reportFaces = faces.map(([style, origin, layers]) => ({
    family: name,
    style,
    origin,
    source: null,
    substituteFamily: origin === 'substituted' ? 'Inter' : null,
    nodeIds: Array.from({ length: layers }, () => `${name}-${next++}`),
    nodeNames: []
  }))
  return {
    family: name,
    sanctioned,
    faces: reportFaces,
    usageCount: next,
    missing: reportFaces.some((face) => face.origin === 'missing' || face.origin === 'substituted')
  }
}

function report(families: FontReportFamily[]): DocumentFontReport {
  const faces = families.flatMap((item) => item.faces)
  return {
    families,
    faceCount: faces.length,
    missingFaceCount: faces.filter(
      (face) => face.origin === 'missing' || face.origin === 'substituted'
    ).length,
    pageIds: ['page']
  }
}

const altitude: SanctionedFontPolicy = {
  system: 'Altitude',
  families: ['Public Sans', 'IBM Plex Sans', 'IBM Plex Mono', 'Agrandir'],
  origin: 'document'
}

const team = (state: TeamFontLibraryStatus['state'], faceCount = 0): TeamFontLibraryStatus => ({
  state,
  location,
  faceCount,
  skipped: [],
  fromCache: state === 'offline' || state === 'rate-limited',
  resetAt: null
})

const available = ['Public Sans', 'IBM Plex Sans', 'IBM Plex Mono', 'Inter', 'Roboto', 'Manrope']
const STYLES = ['Regular', 'Medium', 'SemiBold', 'Bold']

const missingAgrandir = report([
  family(
    'Agrandir',
    [
      ['Bold', 'substituted', 4],
      ['Regular', 'substituted', 2]
    ],
    true
  ),
  family('Comic Neue', [['Regular', 'missing', 1]], false),
  family(
    'Public Sans',
    [
      ['Regular', 'web', 12],
      ['Bold', 'web', 3]
    ],
    true
  ),
  family('Inter', [['Regular', 'bundled', 5]], false),
  family('IBM Plex Mono', [['Regular', 'team', 2]], true)
])

type Args = {
  report: DocumentFontReport
  policy: SanctionedFontPolicy
  teamStatus: TeamFontLibraryStatus
}

const meta = {
  title: 'Fonts/Document font report',
  args: { report: missingAgrandir, policy: altitude, teamStatus: team('empty') },
  render: (args) => ({
    components: { FontReportView },
    setup: () => ({
      args,
      folder: FOLDER,
      styles: STYLES,
      suggestionsFor: (missing: string) =>
        suggestFontReplacements(missing, available, { sanctionedFamilies: args.policy.families })
    }),
    template: `
      <div class="max-w-xl bg-panel p-4 text-surface">
        <FontReportView
          :report="args.report"
          :policy="args.policy"
          :team-status="args.teamStatus"
          :folder-href="folder"
          :suggestions-for="suggestionsFor"
          :styles="styles"
        />
      </div>`
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

/** Agrandir is licensed and not in the team library yet: guidance links to `fonts/`. */
export const MissingLicensedFont: Story = {}

export const AllResolved: Story = {
  args: {
    report: report([
      family('Agrandir', [['Bold', 'team', 4]], true),
      family('Public Sans', [['Regular', 'web', 12]], true)
    ]),
    teamStatus: team('ready', 6)
  }
}

export const PresetPolicyOffline: Story = {
  args: {
    policy: { ...altitude, origin: 'preset' },
    teamStatus: team('offline', 6)
  }
}

export const SignedOut: Story = { args: { teamStatus: team('signed-out') } }

export const EmptyDocument: Story = { args: { report: report([]) } }

/** Opening Replace suggests sanctioned families first. */
export const ReplaceSuggestions: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const [replace] = canvas.getAllByRole('button', { name: 'Replace…' })
    await userEvent.click(replace)
    const suggestions = canvas.getByRole('radiogroup', { name: 'Suggestions' })
    const first = within(suggestions).getAllByRole('radio')[0]
    await expect(first).toHaveAccessibleName('Public Sans')
    await expect(first).toHaveAttribute('aria-checked', 'true')
  }
}
