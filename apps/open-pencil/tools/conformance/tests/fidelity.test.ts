import { expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { resolveWorkspaceRoot } from '@open-pencil/package-artifacts'

import { isEmpty, same } from '../src/core'
import {
  BASELINE_PATH,
  MUST_BE_PERFECT,
  gateFailures,
  measureFidelity,
  type FidelityBaseline
} from '../src/fidelity'
import { buildSyntheticFixture } from '../src/synthetic-fixture'

test('treats the empty string, empty collections and nullish values as absent', () => {
  for (const value of [undefined, null, '', [], {}, new Map(), new Set()]) {
    expect(isEmpty(value)).toBe(true)
  }
  expect(isEmpty(0)).toBe(false)
  expect(isEmpty(false)).toBe(false)
})

test('compares values ignoring key order and float noise', () => {
  expect(same({ position: 0, color: 'red' }, { color: 'red', position: 0 })).toBe(true)
  expect(same(0.1 + 0.2, 0.3)).toBe(true)
  expect(same(new Map([['a', 1]]), new Map([['a', 2]]))).toBe(false)
})

test('the synthetic fixture passes the committed baseline', async () => {
  const root = await resolveWorkspaceRoot(import.meta.dir)
  const baseline = JSON.parse(await readFile(join(root, BASELINE_PATH), 'utf8')) as FidelityBaseline

  const measurement = measureFidelity(buildSyntheticFixture(), false)

  expect(gateFailures(measurement, baseline)).toEqual([])
  expect(measurement.baseline.perfect).toEqual([...MUST_BE_PERFECT])
})

test('the gate names a property that regressed below its baseline', () => {
  const measurement = measureFidelity(buildSyntheticFixture(), false)
  const inflated: FidelityBaseline = {
    ...measurement.baseline,
    properties: { ...measurement.baseline.properties, height: 1.5 }
  }

  expect(gateFailures(measurement, inflated)).toContainEqual(
    expect.stringContaining('height regressed')
  )
})
