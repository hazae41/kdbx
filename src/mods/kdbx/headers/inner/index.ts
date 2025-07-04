import { Opaque } from "@hazae41/binary"
import { Cursor } from "@hazae41/cursor"
import { Vector } from "mods/kdbx/vector/index.js"
import { Cipher } from "./cipher/index.js"

export class HeadersAndContent {

  constructor(
    readonly headers: Headers,
    readonly content: Document
  ) { }

}

export namespace HeadersAndContent {

  export function readOrThrow(cursor: Cursor) {
    const headers = Headers.readOrThrow(cursor)
    const content = cursor.readOrThrow(cursor.remaining)

    const raw = new TextDecoder().decode(content)
    const xml = new DOMParser().parseFromString(raw, "text/xml")

    return new HeadersAndContent(headers, xml)
  }

}

export class Headers {

  constructor(
    readonly value: Vector<{ 1: readonly [Cipher], 2: readonly [Opaque], 3: readonly Opaque[] }>,
  ) { }

  get cipher() {
    return this.value.indexed[1][0]
  }

  get key() {
    return this.value.indexed[2][0]
  }

  get binary() {
    return this.value.indexed[3]
  }

}

export namespace Headers {

  export function readOrThrow(cursor: Cursor) {
    const vector = Vector.readOrThrow(cursor)

    if (vector.indexed[1].length !== 1)
      throw new Error()
    const a = [vector.indexed[1][0].readIntoOrThrow(Cipher)] as const

    if (vector.indexed[2].length !== 1)
      throw new Error()
    const b = [vector.indexed[2][0]] as const

    if (vector.indexed[3].length === 0)
      throw new Error()
    const c = vector.indexed[3]

    const indexed = { 1: a, 2: b, 3: c }

    return new Headers(new Vector(vector.entries, indexed))
  }

}
