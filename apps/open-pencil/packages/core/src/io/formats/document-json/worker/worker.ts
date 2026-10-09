import type { SceneNode } from '@open-pencil/scene-graph'

import type { WriteDocumentJSONOptions } from '#core/io/formats/document-json/write'

import { writeHashedDocumentJSON } from './hashed'
import type { DocumentJSONWorkerRequest, DocumentJSONWorkerResponse } from './protocol'
import { graphFromDocumentJSONSnapshot, type DocumentJSONGraphHeader } from './transfer'

/**
 * Writes a document-json snapshot off the main thread: the graph arrives in pieces, the
 * writer and the blob hashing run here, and the file bytes go back as transfers.
 */
let header: DocumentJSONGraphHeader | null = null
let options: WriteDocumentJSONOptions | null = null
let nodes: SceneNode[] = []
let images: Array<[string, Uint8Array]> = []

function reply(message: DocumentJSONWorkerResponse, transfer: Transferable[] = []) {
  self.postMessage(message, { transfer })
}

/** Buffers the worker owns outright, which can move to the main thread without a copy. */
function ownedBuffers(files: ReadonlyArray<{ bytes: Uint8Array }>): ArrayBuffer[] {
  const buffers = new Set<ArrayBuffer>()
  for (const { bytes } of files) {
    if (bytes.buffer instanceof ArrayBuffer && bytes.byteLength === bytes.buffer.byteLength) {
      buffers.add(bytes.buffer)
    }
  }
  return [...buffers]
}

async function finish() {
  if (!header || !options) throw new Error('Document snapshot ended before it began')
  const graph = graphFromDocumentJSONSnapshot({ header, nodes, images })
  header = null
  nodes = []
  images = []
  const written = await writeHashedDocumentJSON(graph, options)
  reply(
    { type: 'done', files: written.files, pages: written.pages, blobSHAs: written.blobSHAs },
    ownedBuffers(written.files)
  )
}

self.onmessage = (event: MessageEvent<DocumentJSONWorkerRequest>) => {
  const message = event.data
  switch (message.type) {
    case 'begin':
      header = message.header
      options = message.options
      nodes = []
      images = []
      return
    case 'nodes':
      for (const node of message.nodes) nodes.push(node)
      return
    case 'image':
      images.push([message.hash, message.bytes])
      return
    case 'end':
      finish().catch((error: unknown) => {
        reply({ type: 'error', message: error instanceof Error ? error.message : String(error) })
      })
  }
}
