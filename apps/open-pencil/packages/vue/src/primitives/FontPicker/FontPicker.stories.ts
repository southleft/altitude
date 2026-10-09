import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'

import FontPickerDemo from './FontPickerDemo.vue'

const meta = {
  title: 'Vue SDK/Primitives/Font Picker',
  component: FontPickerDemo,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Searchable, virtualised font family combobox. Sections pin a source, such as a team font library, above the remaining families.'
      }
    }
  }
} satisfies Meta<typeof FontPickerDemo>

export default meta
type Story = StoryObj<typeof meta>

export const TeamSection: Story = {}

export const PickTeamFont: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Show popup' }))
    const body = within(canvasElement.ownerDocument.body)
    await expect(await body.findByText('Team fonts · altitude-designs')).toBeVisible()
    await expect(body.getByText('All fonts')).toBeVisible()
    await userEvent.click(body.getByRole('option', { name: /Agrandir/ }))
    await expect(canvas.getByRole('status', { name: 'Selected family' })).toHaveTextContent(
      'Agrandir'
    )
  }
}
