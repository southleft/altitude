import type { SceneGraph } from '@open-pencil/scene-graph'

import { gitBlobSHA } from '#core/io/formats/document-json/blob-sha'
import {
  writeDocumentJSON,
  type DocumentJSONSnapshot,
  type WriteDocumentJSONOptions
} from '#core/io/formats/document-json/write'

/** A written document plus each file's git blob SHA, by path. */
export interface HashedDocumentJSONSnapshot extends DocumentJSONSnapshot {
  blobSHAs: Record<string, string>
}

/** Write a graph and hash every file: the worker's job, and the main-thread fallback. */
export async function writeHashedDocumentJSON(
  graph: SceneGraph,
  options: WriteDocumentJSONOptions
): Promise<HashedDocumentJSONSnapshot> {
  const snapshot = writeDocumentJSON(graph, options)
  const hashes = await Promise.all(snapshot.files.map((file) => gitBlobSHA(file.bytes)))
  const blobSHAs: Record<string, string> = {}
  snapshot.files.forEach((file, index) => {
    blobSHAs[file.path] = hashes[index]
  })
  return { ...snapshot, blobSHAs }
}
