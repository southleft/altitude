import type { SceneNode } from '@open-pencil/scene-graph'

import type {
  DocumentJSONPage,
  WriteDocumentJSONOptions
} from '#core/io/formats/document-json/write'

import type { DocumentJSONGraphHeader } from './transfer'

/** Main thread to worker: one `begin`, any number of `nodes` and `image`, then `end`. */
export type DocumentJSONWorkerRequest =
  | { type: 'begin'; header: DocumentJSONGraphHeader; options: WriteDocumentJSONOptions }
  | { type: 'nodes'; nodes: SceneNode[] }
  | { type: 'image'; hash: string; bytes: Uint8Array }
  | { type: 'end' }

/** Worker to main thread. File bytes are transferred, not copied. */
export type DocumentJSONWorkerResponse =
  | {
      type: 'done'
      files: Array<{ path: string; bytes: Uint8Array }>
      pages: DocumentJSONPage[]
      blobSHAs: Record<string, string>
    }
  | { type: 'error'; message: string }
