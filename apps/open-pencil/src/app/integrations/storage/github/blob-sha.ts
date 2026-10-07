const encoder = new TextEncoder()

/** Git's object id for file content: SHA-1 of `blob <length>\0<content>`. */
export async function gitBlobSHA(bytes: Uint8Array): Promise<string> {
  const header = encoder.encode(`blob ${bytes.byteLength}\0`)
  const object = new Uint8Array(header.byteLength + bytes.byteLength)
  object.set(header)
  object.set(bytes, header.byteLength)
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', object))
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
