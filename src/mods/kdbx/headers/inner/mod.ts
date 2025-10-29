import type { Lengthed } from "@/libs/lengthed/mod.ts"
import { Opaque } from "@/libs/struct/mod.ts"
import { Vector } from "@/mods/kdbx/vector/mod.ts"
import { Readable, Writable } from "@hazae41/binary"
import type { Cursor } from "@hazae41/cursor"
import { Cipher } from "./cipher/mod.ts"
import { KeePassFile } from "./markup/mod.ts"

export class HeadersAndContentWithBytes {

  constructor(
    readonly headers: Headers,
    readonly content: ContentWithBytes
  ) { }

  static computeOrThrow(headers: Headers, content: KeePassFile): HeadersAndContentWithBytes {
    const contentWithBytes = ContentWithBytes.computeOrThrow(content)
    return new HeadersAndContentWithBytes(headers, contentWithBytes)
  }

  rotateOrThrow(): HeadersAndContentWithBytes {
    return new HeadersAndContentWithBytes(this.headers.rotateOrThrow(), this.content)
  }

  sizeOrThrow(): number {
    return this.headers.sizeOrThrow() + this.content.sizeOrThrow()
  }

  writeOrThrow(cursor: Cursor<ArrayBuffer>) {
    this.headers.writeOrThrow(cursor)
    this.content.writeOrThrow(cursor)
  }

  recomputeOrThrow(): HeadersAndContentWithBytes {
    return HeadersAndContentWithBytes.computeOrThrow(this.headers, this.content.value)
  }

}

export class ContentWithBytes {

  constructor(
    readonly bytes: Opaque<ArrayBuffer>,
    readonly value: KeePassFile
  ) { }

  static computeOrThrow(content: KeePassFile): ContentWithBytes {
    const string = new XMLSerializer().serializeToString(content.document)
    const opaque = new Opaque(new TextEncoder().encode(string))

    return new ContentWithBytes(opaque, content)
  }

  sizeOrThrow(): number {
    return this.bytes.sizeOrThrow()
  }

  writeOrThrow(cursor: Cursor<ArrayBuffer>) {
    this.bytes.writeOrThrow(cursor)
  }

  recomputeOrThrow(): ContentWithBytes {
    return ContentWithBytes.computeOrThrow(this.value)
  }

}

export namespace ContentWithBytes {

  export function readOrThrow(cursor: Cursor<ArrayBuffer>): ContentWithBytes {
    const bytes = new Opaque(cursor.readOrThrow(cursor.remaining))

    const raw = new TextDecoder().decode(bytes.bytes)
    const xml = new DOMParser().parseFromString(raw, "text/xml")

    return new ContentWithBytes(bytes, new KeePassFile(xml))
  }

}

export namespace HeadersAndContentWithBytes {

  export function readOrThrow(cursor: Cursor<ArrayBuffer>): HeadersAndContentWithBytes {
    const headers = Headers.readOrThrow(cursor)
    const content = ContentWithBytes.readOrThrow(cursor)

    return new HeadersAndContentWithBytes(headers, content)
  }

}

export interface HeadersInit {
  readonly cipher: Cipher
  readonly key: Opaque<ArrayBuffer, 32>
  readonly binary: readonly Opaque<ArrayBuffer>[]
}

export class Headers {

  constructor(
    readonly value: Vector<{
      1: readonly [Cipher],
      2: readonly [Opaque<ArrayBuffer>],
      3: readonly Opaque<ArrayBuffer>[]
    }>,
  ) { }

  get cipher(): Cipher {
    return this.value.value[1][0]
  }

  get key(): Opaque<ArrayBuffer> {
    return this.value.value[2][0]
  }

  get binary(): readonly Opaque<ArrayBuffer>[] {
    return this.value.value[3]
  }

  sizeOrThrow(): number {
    return this.value.sizeOrThrow()
  }

  writeOrThrow(cursor: Cursor<ArrayBuffer>) {
    this.value.writeOrThrow(cursor)
  }

  cloneOrThrow(): Headers {
    return Readable.readFromBytesOrThrow(Headers, Writable.writeToBytesOrThrow(this))
  }

  rotateOrThrow(): Headers {
    const { cipher, binary } = this

    const key = new Opaque(crypto.getRandomValues(new Uint8Array(32)) as Uint8Array<ArrayBuffer> & Lengthed<32>)

    return Headers.initOrThrow({ cipher, key, binary })
  }

  async getCipherOrThrow(): Promise<Cipher.ChaCha20> {
    return await this.cipher.initOrThrow(this.key.bytes)
  }

}

export namespace Headers {

  export function initOrThrow(init: HeadersInit): Headers {
    const { cipher, key, binary } = init

    const indexed = {
      1: [cipher],
      2: [key],
      3: binary
    } as const

    return new Headers(Vector.initOrThrow(indexed))
  }

  export function readOrThrow(cursor: Cursor<ArrayBuffer>): Headers {
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

