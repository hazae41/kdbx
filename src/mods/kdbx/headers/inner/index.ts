import { Opaque, Readable, Writable } from "@hazae41/binary"
import { Cursor } from "@hazae41/cursor"
import { Vector } from "mods/kdbx/vector/index.js"
import { Cipher } from "./cipher/index.js"

export class HeadersAndContent {

  constructor(
    readonly headers: Headers,
    readonly content: Content
  ) { }

  sizeOrThrow() {
    return this.headers.sizeOrThrow() + this.content.sizeOrThrow()
  }

  writeOrThrow(cursor: Cursor) {
    this.headers.writeOrThrow(cursor)
    this.content.writeOrThrow(cursor)
  }

}

export class Content {

  constructor(
    readonly value: Opaque
  ) { }

  static fromOrThrow(xml: Document) {
    const text = new XMLSerializer().serializeToString(xml)
    const data = new TextEncoder().encode(text)

    return new Content(new Opaque(data))
  }

  intoOrThrow() {
    const raw = new TextDecoder().decode(this.value.bytes)
    const xml = new DOMParser().parseFromString(raw, "text/xml")

    return xml
  }

  sizeOrThrow() {
    return this.value.sizeOrThrow()
  }

  writeOrThrow(cursor: Cursor) {
    this.value.writeOrThrow(cursor)
  }

}

export namespace HeadersAndContent {

  export function readOrThrow(cursor: Cursor) {
    const headers = Headers.readOrThrow(cursor)
    const content = new Opaque(cursor.readOrThrow(cursor.remaining))

    return new HeadersAndContent(headers, new Content(content))
  }

}

export class Headers {

  constructor(
    readonly value: Vector<{ 1: readonly [Cipher], 2: readonly [Opaque], 3: readonly Opaque[] }>,
  ) { }

  get cipher() {
    return this.value.value[1][0]
  }

  get key() {
    return this.value.value[2][0]
  }

  get binary() {
    return this.value.value[3]
  }

  sizeOrThrow() {
    return this.value.sizeOrThrow()
  }

  writeOrThrow(cursor: Cursor) {
    this.value.writeOrThrow(cursor)
  }

  cloneOrThrow() {
    return Readable.readFromBytesOrThrow(Headers, Writable.writeToBytesOrThrow(this))
  }

  async getCipherOrThrow() {
    return await this.cipher.initOrThrow(this.key.bytes)
  }

}

export namespace Headers {

  export function readOrThrow(cursor: Cursor) {
    const vector = Vector.readOrThrow(cursor)

    if (vector.value[1].length !== 1)
      throw new Error()
    const a = [vector.value[1][0].readIntoOrThrow(Cipher)] as const

    if (vector.value[2].length !== 1)
      throw new Error()
    const b = [vector.value[2][0]] as const

    if (vector.value[3].length === 0)
      throw new Error()
    const c = vector.value[3]

    const indexed = { 1: a, 2: b, 3: c }

    return new Headers(new Vector(vector.bytes, indexed))
  }

}
