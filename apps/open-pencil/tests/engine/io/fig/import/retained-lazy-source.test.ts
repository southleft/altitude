import { describe, expect, test } from 'bun:test'

import {
  ensureLazyFigImportContext,
  getLazyFigImportContext,
  hasLazyFigImport,
  isLazyFigImportDeferred,
  populateLazyFigImportRoots,
  setDeferredLazyFigImportContext,
  setLazyFigImportContext,
  type LazyFigImportSource
} from '@open-pencil/core/kiwi/fig/lazy-import'
import {
  deserializeSceneGraph,
  lazyFigImportSourceChunks,
  serializeSceneGraph,
  serializedSceneGraphTransferList
} from '@open-pencil/core/kiwi/fig/parse/transfer'
import {
  canUseFigPopulationWorker,
  registerFigPopulationWorker,
  releaseFigPopulationWorker
} from '@open-pencil/core/kiwi/fig/population/client'
import type { FigSessionRequest } from '@open-pencil/core/kiwi/fig/session/protocol'
import { SceneGraph } from '@open-pencil/scene-graph'

function createLazyGraph() {
  const graph = new SceneGraph()
  const [page1] = graph.getPages()
  const page2 = graph.addPage('Page 2')
  const component = graph.createNode('COMPONENT', page1.id, { name: 'Button' })
  graph.createNode('RECTANGLE', component.id, { name: 'Background' })
  const instance = graph.createNode('INSTANCE', page2.id, { componentId: component.id })
  const blob = new Uint8Array([1, 2, 3])
  setLazyFigImportContext(graph, {
    changeMap: new Map([['1:1', { name: 'Button' }]]),
    guidToNodeId: new Map([['1:1', component.id]]),
    blobs: [blob],
    populatedRootIds: new Set([page1.id])
  })
  return { graph, page1, page2, instance, blob }
}

function sourceOf(graph: SceneGraph): LazyFigImportSource {
  const context = getLazyFigImportContext(graph)
  if (!context) throw new Error('graph has no lazy context')
  return context
}

/** A session port whose replies the test sends by hand. */
function createFakeSession() {
  const sent: FigSessionRequest[] = []
  let terminated = false
  const port = {
    onmessage: null as ((event: MessageEvent) => void) | null,
    postMessage: (message: FigSessionRequest) => sent.push(message),
    start: () => undefined,
    close: () => undefined
  }
  const worker = {
    onerror: null,
    onmessage: null,
    terminate: () => (terminated = true)
  }
  return {
    port: port as MessagePort,
    worker: worker as Worker,
    sent,
    isTerminated: () => terminated,
    reply: (data: unknown) => port.onmessage?.({ data } as MessageEvent)
  }
}

/** Answer a lazy-source request the way the session worker does: chunks, then blobs. */
function replyWithSource(
  session: ReturnType<typeof createFakeSession>,
  source: LazyFigImportSource
): void {
  const request = session.sent.find((message) => message.type === 'lazy-source')
  if (request?.type !== 'lazy-source') throw new Error('no lazy-source request was sent')
  for (const chunk of lazyFigImportSourceChunks(source, 1)) {
    session.reply({ type: 'lazy-source-chunk', requestId: request.requestId, chunk })
  }
  session.reply({ type: 'lazy-source-result', requestId: request.requestId, blobs: source.blobs })
}

describe('retained lazy .fig source', () => {
  test('a retained graph message carries populated pages but not the source', () => {
    const { graph, page1 } = createLazyGraph()

    const retained = serializeSceneGraph(graph, { retainLazySource: true })
    expect(retained.lazyFigImport).toBeUndefined()
    expect(retained.lazyFigImportRetained).toEqual({ populatedRootIds: [page1.id] })
    expect(serializedSceneGraphTransferList(retained)).toHaveLength(0)

    const full = serializeSceneGraph(graph)
    expect(full.lazyFigImport?.changeMap).toHaveLength(1)
    expect(full.lazyFigImportRetained).toBeUndefined()
    expect(serializedSceneGraphTransferList(full)).toHaveLength(1)
    expect(getLazyFigImportContext(deserializeSceneGraph(full))?.changeMap.size).toBe(1)
  })

  test('a deferred source loads once on demand and keeps populated pages', async () => {
    const source = createLazyGraph()
    const { graph, page1, page2, instance } = createLazyGraph()
    let loads = 0
    setDeferredLazyFigImportContext(graph, [page1.id], async () => {
      loads++
      return {
        ...sourceOf(source.graph),
        guidToNodeId: new Map(),
        changeMap: new Map()
      }
    })

    expect(hasLazyFigImport(graph)).toBe(true)
    expect(isLazyFigImportDeferred(graph)).toBe(true)
    expect(populateLazyFigImportRoots(graph, [page2.id])).toBe(false)

    const [first, second] = await Promise.all([
      ensureLazyFigImportContext(graph),
      ensureLazyFigImportContext(graph)
    ])
    expect(loads).toBe(1)
    expect(first).toBe(second)
    expect(isLazyFigImportDeferred(graph)).toBe(false)
    expect([...(first?.populatedRootIds ?? [])]).toEqual([page1.id])

    expect(populateLazyFigImportRoots(graph, [page2.id])).toBe(true)
    expect(graph.getChildren(instance.id)).toHaveLength(1)
  })

  test('an unavailable source resolves empty and may be retried', async () => {
    const { graph, page1 } = createLazyGraph()
    let attempts = 0
    setDeferredLazyFigImportContext(graph, [page1.id], async () => {
      attempts++
      if (attempts === 1) throw new Error('worker gone')
      return sourceOf(createLazyGraph().graph)
    })
    const warn = console.warn
    console.warn = () => undefined
    try {
      expect(await ensureLazyFigImportContext(graph)).toBeUndefined()
    } finally {
      console.warn = warn
    }
    expect(isLazyFigImportDeferred(graph)).toBe(true)
    expect(await ensureLazyFigImportContext(graph)).toBeDefined()
    expect(attempts).toBe(2)
  })

  test('the population worker serves its retained source through the session port', async () => {
    const { graph, page1 } = createLazyGraph()
    const workerSource = sourceOf(graph)
    workerSource.changeMap.set('1:2', { name: 'Second' })
    const session = createFakeSession()
    registerFigPopulationWorker(graph, session.worker, session.port, {
      retainedPopulatedRootIds: [page1.id]
    })
    expect(canUseFigPopulationWorker(graph)).toBe(true)
    expect(isLazyFigImportDeferred(graph)).toBe(true)

    const loading = ensureLazyFigImportContext(graph)
    replyWithSource(session, workerSource)

    const context = await loading
    expect(context?.changeMap.get('1:1')).toEqual({ name: 'Button' })
    expect(context?.changeMap.get('1:2')).toEqual({ name: 'Second' })
    expect(context?.blobs).toEqual(workerSource.blobs)
    expect([...(context?.populatedRootIds ?? [])]).toEqual([page1.id])
    releaseFigPopulationWorker(graph)
  })

  test('a failing worker hands its source back before it is terminated', async () => {
    const { graph, page1, page2 } = createLazyGraph()
    const workerSource = sourceOf(graph)
    const session = createFakeSession()
    registerFigPopulationWorker(graph, session.worker, session.port, {
      retainedPopulatedRootIds: [page1.id]
    })

    session.reply({ type: 'population-error', error: 'boom' })
    expect(canUseFigPopulationWorker(graph)).toBe(false)
    expect(session.isTerminated()).toBe(false)

    replyWithSource(session, workerSource)

    await ensureLazyFigImportContext(graph)
    await Promise.resolve()
    expect(session.isTerminated()).toBe(true)
    expect(populateLazyFigImportRoots(graph, [page2.id])).toBe(true)
    releaseFigPopulationWorker(graph)
  })

  test('other session replies still reach the reader that registered first', () => {
    const graph = new SceneGraph()
    const session = createFakeSession()
    const forwarded: unknown[] = []
    session.port.onmessage = (event: MessageEvent) => forwarded.push(event.data)
    registerFigPopulationWorker(graph, session.worker, session.port)

    const reply = { type: 'original-archive-result', requestId: 'a', bytes: new Uint8Array() }
    session.reply(reply)
    expect(forwarded).toEqual([reply])
    releaseFigPopulationWorker(graph)
  })
})
