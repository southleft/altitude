import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'

import IconButton from '@/components/ui/button/IconButton.vue'

import AppVirtualSelect from './AppVirtualSelect.vue'

const styles = [
  { value: 'NONE', label: 'None' },
  ...Array.from({ length: 3000 }, (_, index) => ({
    value: `style-${index}`,
    label: `Color/Palette ${String(Math.floor(index / 10)).padStart(3, '0')}/${index % 10}`
  }))
]

const meta = {
  title: 'Design System/Virtual Select',
  parameters: { layout: 'centered' },
  render: () => ({
    components: { AppVirtualSelect, IconButton },
    setup() {
      const value = ref('style-42')
      return { value, styles }
    },
    template: `
      <div class="flex w-64 flex-col gap-4 bg-app p-6 text-surface">
        <AppVirtualSelect
          v-model="value"
          :options="styles"
          label="Fill style"
          search-placeholder="Search…"
        />
        <AppVirtualSelect v-model="value" :options="styles" label="Fill style">
          <template #trigger>
            <IconButton label="Fill style"><icon-lucide-layout-grid class="size-3.5" /></IconButton>
          </template>
        </AppVirtualSelect>
        <p class="font-mono text-[10px] text-muted">{{ value }}</p>
      </div>`
  })
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const LongCatalog: Story = {}
