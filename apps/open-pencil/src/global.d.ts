import type { OpenPencilWindowAPI } from './app/browser-bridge'

export {}

declare global {
  interface FilePickerAcceptType {
    description: string
    accept: Record<string, string[]>
  }

  interface FilePickerOptions {
    multiple?: boolean
    types?: FilePickerAcceptType[]
    suggestedName?: string
  }

  interface DirectoryPickerOptions {
    id?: string
    mode?: 'read' | 'readwrite'
  }

  interface Window {
    openPencil?: OpenPencilWindowAPI
    showOpenFilePicker?(options?: FilePickerOptions): Promise<FileSystemFileHandle[]>
    showSaveFilePicker?(options?: FilePickerOptions): Promise<FileSystemFileHandle>
    showDirectoryPicker?(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>
    mockWindowOpen?(url: string): void
  }
}
