import { Buffers } from "@/libs/buffers/mod.ts"

declare global {
  interface Uint8Array {
    toBase64(): string
    toHex(): string
  }

  interface Uint8ArrayConstructor {
    fromBase64(text: string): Uint8Array
    fromHex(text: string): Uint8Array
  }
}

export namespace Bytes {

  export function equals(a: Uint8Array, b: Uint8Array): boolean {
    if ("indexedDB" in globalThis)
      return indexedDB.cmp(a, b) === 0
    if ("process" in globalThis)
      return Buffers.fromView(a).equals(b)
    throw new Error(`Could not compare bytes`)
  }

}