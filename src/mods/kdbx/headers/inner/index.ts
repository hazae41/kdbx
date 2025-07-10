import { Opaque, Readable, Writable } from "@hazae41/binary"
import { Cursor } from "@hazae41/cursor"
import { Lengthed } from "@hazae41/lengthed"
import { Vector } from "mods/kdbx/vector/index.js"
import { Cipher } from "./cipher/index.js"
import { KeePassFile } from "./markup/index.js"

export class HeadersAndContentWithBytes {

  constructor(
    readonly headers: Headers,
    readonly content: ContentWithBytes
  ) { }

  static computeOrThrow(headers: Headers, content: KeePassFile) {
    const contentWithBytes = ContentWithBytes.computeOrThrow(content)
    return new HeadersAndContentWithBytes(headers, contentWithBytes)
  }

  async rotateOrThrow() {
    return new HeadersAndContentWithBytes(await this.headers.rotateOrThrow(), this.content)
  }

  sizeOrThrow() {
    return this.headers.sizeOrThrow() + this.content.sizeOrThrow()
  }

  writeOrThrow(cursor: Cursor) {
    this.headers.writeOrThrow(cursor)
    this.content.writeOrThrow(cursor)
  }

  recomputeOrThrow() {
    return HeadersAndContentWithBytes.computeOrThrow(this.headers, this.content.value)
  }

}

export class ContentWithBytes {

  constructor(
    readonly bytes: Opaque,
    readonly value: KeePassFile
  ) { }

  static computeOrThrow(content: KeePassFile) {
    const string = new XMLSerializer().serializeToString(content.document)
    const opaque = new Opaque(new TextEncoder().encode(string))

    return new ContentWithBytes(opaque, content)
  }

  sizeOrThrow() {
    return this.bytes.sizeOrThrow()
  }

  writeOrThrow(cursor: Cursor) {
    this.bytes.writeOrThrow(cursor)
  }

  recomputeOrThrow() {
    return ContentWithBytes.computeOrThrow(this.value)
  }

}

export namespace ContentWithBytes {

  export function readOrThrow(cursor: Cursor) {
    const bytes = new Opaque(cursor.readOrThrow(cursor.remaining))

    const raw = new TextDecoder().decode(bytes.bytes)
    const xml = new DOMParser().parseFromString(raw, "text/xml")

    return new ContentWithBytes(bytes, new KeePassFile(xml))
  }

}

export namespace HeadersAndContentWithBytes {

  export function readOrThrow(cursor: Cursor) {
    const headers = Headers.readOrThrow(cursor)
    const content = ContentWithBytes.readOrThrow(cursor)

    return new HeadersAndContentWithBytes(headers, content)
  }

}

export interface HeadersInit {
  readonly cipher: Cipher
  readonly key: Opaque<32>
  readonly binary: readonly Opaque[]
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

  async rotateOrThrow() {
    const { cipher, binary } = this

    const key = new Opaque(new Uint8Array(crypto.getRandomValues(new Uint8Array(32))) as Uint8Array & Lengthed<32>)

    return Headers.initOrThrow({ cipher, key, binary })
  }

  async getCipherOrThrow() {
    return await this.cipher.initOrThrow(this.key.bytes)
  }

}

export namespace Headers {

  export function initOrThrow(init: HeadersInit) {
    const { cipher, key, binary } = init

    const indexed = {
      1: [cipher],
      2: [key],
      3: binary
    } as const

    return new Headers(Vector.initOrThrow(indexed))
  }

  export function readOrThrow(cursor: Cursor) {
    const vector = Vector.readOrThrow(cursor)

    if (vector.value[1].length !== 1)
      throw new Error()
    if (vector.value[2].length !== 1)
      throw new Error()
    if (vector.value[3].length === 0)
      throw new Error()

    const indexed = {
      1: [vector.value[1][0].readIntoOrThrow(Cipher)],
      2: [vector.value[2][0]],
      3: vector.value[3]
    } as const

    return new Headers(new Vector(vector.bytes, indexed))
  }

}

