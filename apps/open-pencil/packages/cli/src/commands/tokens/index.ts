import { defineCommand } from 'citty'

import importCmd from './import'

export default defineCommand({
  meta: { description: 'Import DTCG design tokens into document variables' },
  subCommands: {
    import: importCmd
  }
})
