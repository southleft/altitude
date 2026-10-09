import { defineCommand } from 'citty'

import diff from './diff'

export default defineCommand({
  meta: { description: 'Review committed design documents (document-json folders)' },
  subCommands: { diff }
})
