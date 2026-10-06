import { params } from '@nanostores/i18n'

import { i18n } from '#vue/i18n/create'

export const variablesMessageDefaults = {
  createCollection: 'Create collection',
  renameCollection: 'Rename collection',
  deleteCollection: 'Delete collection',
  untitledCollection: 'Untitled collection',
  localVariables: 'Local variables',
  noVariableCollections: 'No variable collections',
  modes: 'Modes',
  addMode: 'Add mode',
  renameMode: 'Rename mode',
  duplicateMode: 'Duplicate mode',
  deleteMode: 'Delete mode',
  setDefaultMode: 'Set as default',
  importTokens: 'Import tokens…',
  importTokensTitle: 'Import design tokens',
  importTokensDescription:
    'Import DTCG token files ($value / $type JSON) as variable collections and modes. Importing the same tokens again updates the variables in place and keeps their bindings.',
  tokenSource: 'Tokens',
  chooseTokenFolder: 'Choose folder…',
  chooseTokenFiles: 'Choose JSON or ZIP…',
  noTokenSource: 'No tokens chosen',
  tokenFileCount: params('{count} JSON files'),
  readingTokens: 'Reading…',
  tokenMapping: 'Mapping preset',
  tokenMappingHelp:
    'A preset maps folders and files to collections and modes, such as Light/Dark or brands. Without one, every file merges into a single collection.',
  chooseTokenMapping: 'Choose preset…',
  noTokenMapping: 'No preset',
  removeTokenMapping: 'Remove preset',
  pruneTokens: 'Delete variables the tokens no longer define',
  runTokenImport: 'Import',
  tokenImportDone: 'Tokens imported',
  tokenImportSummary: params('{created} created, {updated} updated, {unchanged} unchanged.'),
  tokenImportRemoved: params(
    '{count} variables from an earlier import are no longer in the tokens.'
  ),
  tokenImportIssues: params('{count} tokens did not import exactly; see the list below.'),
  tokenImportFailed: 'Could not import tokens',
  unreadableTokenFiles: params('{count} files are not valid JSON and were skipped.')
} as const

export const variablesMessages = i18n('variables', variablesMessageDefaults)
