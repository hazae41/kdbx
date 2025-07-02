import { Buffers } from "libs/buffers/index.js"

export interface Uint8Array<N extends number = number> extends globalThis.Uint8Array {
  slice(): Uint8Array<N> & globalThis.Uint8Array<ArrayBuffer>
}

export namespace Bytes {

  export function equals<N extends number>(a: Uint8Array, b: Uint8Array<N>): a is Uint8Array<N> {
    if ("indexedDB" in globalThis)
      return indexedDB.cmp(a, b) === 0
    if ("process" in globalThis)
      return Buffers.fromView(a).equals(b)
    throw new Error(`Could not compare bytes`)
  }

}