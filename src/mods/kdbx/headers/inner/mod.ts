// deno-lint-ignore-file no-namespace

export * from "./cipher/mod.ts"
export * from "./markup/mod.ts"

import type { Lengthed } from "@/libs/lengthed/mod.ts"
import { Vector } from "@/mods/kdbx/vector/mod.ts"
import { Readable, Unknown, Writable } from "@hazae41/binary"
import type { Cursor } from "@hazae41/cursor"
import { Cipher } from "./cipher/mod.ts"
import { KeePassFile } from "./markup/mod.ts"

export class HeadersAndContentWithBytes {

  constructor(
    readonly headers: Headers,
    readonly content: ContentWithBytes
  ) { }

  static computeOrThrow(headers: Headers, content: KeePassFile): HeadersAndContentWithBytes {
    return new HeadersAndContentWithBytes(headers, ContentWithBytes.computeOrThrow(content))
  }

  rotateOrThrow(content: KeePassFile): HeadersAndContentWithBytes {
    return new HeadersAndContentWithBytes(this.headers.rotateOrThrow(), ContentWithBytes.computeOrThrow(content))
  }

  sizeOrThrow(): number {
    return this.headers.sizeOrThrow() + this.content.sizeOrThrow()
  }

  writeOrThrow(cursor: Cursor<ArrayBuffer>) {
    this.headers.writeOrThrow(cursor)
    this.content.writeOrThrow(cursor)
  }

}

export class ContentWithBytes {

  constructor(
    readonly bytes: Unknown<ArrayBuffer>,
    readonly value: KeePassFile
  ) { }

  static computeOrThrow(value: KeePassFile): ContentWithBytes {
    return new ContentWithBytes(new Unknown(value.encodeOrThrow()), value)
  }

  sizeOrThrow(): number {
    return this.bytes.sizeOrThrow()
  }

  writeOrThrow(cursor: Cursor<ArrayBuffer>) {
    this.bytes.writeOrThrow(cursor)
  }

}

export namespace ContentWithBytes {

  export function readOrThrow(cursor: Cursor<ArrayBuffer>): ContentWithBytes {
    const bytes = new Unknown(cursor.readOrThrow(cursor.remaining))
    const value = KeePassFile.decodeOrThrow(bytes.bytes)

    return new ContentWithBytes(bytes, value)
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
  readonly key: Unknown<ArrayBuffer, 32>
  readonly binary: readonly Unknown<ArrayBuffer>[]
}

export class Headers {

  constructor(
    readonly value: Vector<{
      1: readonly [Cipher],
      2: readonly [Unknown<ArrayBuffer>],
      3: readonly Unknown<ArrayBuffer>[]
    }>,
  ) { }

  get cipher(): Cipher {
    return this.value.value[1][0]
  }

  get key(): Unknown<ArrayBuffer> {
    return this.value.value[2][0]
  }

  get binary(): readonly Unknown<ArrayBuffer>[] {
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

    const key = new Unknown(crypto.getRandomValues(new Uint8Array(32)) as Uint8Array<ArrayBuffer> & Lengthed<32>)

    return Headers.initOrThrow({ cipher, key, binary })
  }

  async getCipherOrThrow(): Promise<Cipher.ChaCha20> {
    return await this.cipher.initOrThrow(this.key.bytes)
  }

}

export namespace Headers {

  export function createOrThrow(cipher: Cipher) {
    const binary = new Array<Unknown<ArrayBuffer, number>>()

    const key = new Unknown(crypto.getRandomValues(new Uint8Array(32)) as Uint8Array<ArrayBuffer> & Lengthed<32>)

    return Headers.initOrThrow({ cipher, key, binary })
  }

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

    const indexed = {
      1: [vector.value[1][0].readIntoOrThrow(Cipher)],
      2: [vector.value[2][0]],
      3: vector.value[3]
    } as const

    return new Headers(new Vector(vector.bytes, indexed))
  }

}

