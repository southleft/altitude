import { expect, type Page } from '@playwright/test'

export interface ModeCollectionSeed {
  collectionId: string
  name: string
  modes: { modeId: string; name: string }[]
}

/** Fixture setup: a color variable in a collection with Light and Dark modes. */
export function seedModeCollection(page: Page, name: string): Promise<ModeCollectionSeed> {
  return page.evaluate((collectionName) => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const collection = store.graph.createCollection(collectionName)
    store.graph.renameMode(collection.id, collection.defaultModeId, 'Light')
    store.graph.addMode(collection.id, 'dark', 'Dark')
    store.graph.createVariable('surface', 'COLOR', collection.id, { r: 1, g: 1, b: 1, a: 1 })
    store.state.sceneVersion++
    const seeded = store.graph.variableCollections.get(collection.id) ?? collection
    return {
      collectionId: seeded.id,
      name: seeded.name,
      modes: seeded.modes.map((mode) => ({ modeId: mode.modeId, name: mode.name }))
    }
  }, name)
}

/** Probe: the name of the collection's active mode. */
export function activeModeName(page: Page, collectionId: string): Promise<string | null> {
  return page.evaluate((id) => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const collection = store.graph.variableCollections.get(id)
    const modeId = store.graph.getActiveModeId(id)
    return collection?.modes.find((mode) => mode.modeId === modeId)?.name ?? null
  }, collectionId)
}

/** UI driver for the right panel's Variables tab. */
export class VariablesTabDriver {
  constructor(private readonly page: Page) {}

  get tab() {
    return this.page.getByTestId('properties-panel').getByRole('tab', { name: 'Variables' })
  }

  get section() {
    return this.page.getByRole('region', { name: 'Variables' })
  }

  get dialog() {
    return this.page.getByTestId('variables-dialog')
  }

  async open(): Promise<void> {
    await this.tab.click()
    await expect(this.section).toBeVisible()
  }

  async openDialog(): Promise<void> {
    await this.open()
    await this.section.getByRole('button', { name: 'Open variables' }).click()
    await expect(this.dialog).toBeVisible()
  }

  modeSelect(collection: string) {
    return this.section.getByRole('combobox', { name: collection, exact: true })
  }

  async selectMode(collection: string, mode: string): Promise<void> {
    await this.modeSelect(collection).click()
    await this.page.getByRole('option', { name: mode, exact: true }).click()
  }
}
