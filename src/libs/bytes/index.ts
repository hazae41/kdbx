import { Buffers } from "libs/buffers/index.js"

export type Uint8Array<N extends number = number> = number extends N
  ? globalThis.Uint8Array
  : globalThis.Uint8Array & { readonly length: N }

export namespace Bytes {

  export function equals<N extends number>(a: Uint8Array, b: Uint8Array<N>): a is Uint8Array<N> {
    if ("indexedDB" in globalThis)
      return indexedDB.cmp(a, b) === 0
    if ("process" in globalThis)
      return Buffers.fromView(a).equals(b)
    throw new Error(`Could not compare bytes`)
  }

}