// deno-lint-ignore-file no-namespace

export * from "./cipher/mod.ts"
export * from "./markup/mod.ts"

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

  size(): number {
    return this.headers.size() + this.content.size()
  }

  write(cursor: Cursor<ArrayBuffer>) {
    this.headers.write(cursor)
    this.content.write(cursor)
  }

}

export class ContentWithBytes {

  constructor(
    readonly bytes: Unknown<ArrayBuffer>,
    readonly value: KeePassFile
  ) { }

  static compute(value: KeePassFile): ContentWithBytes {
    return new ContentWithBytes(new Unknown(value.encode()), value)
  }

  size(): number {
    return this.bytes.size()
  }

  write(cursor: Cursor<ArrayBuffer>) {
    this.bytes.write(cursor)
  }

}

export namespace ContentWithBytes {

  export function read(cursor: Cursor<ArrayBuffer>): ContentWithBytes {
    const bytes = new Unknown(cursor.read(cursor.remaining))
    const value = KeePassFile.decode(bytes.bytes)

    return new ContentWithBytes(bytes, value)
  }

}

export namespace HeadersAndContentWithBytes {

  export function read(cursor: Cursor<ArrayBuffer>): HeadersAndContentWithBytes {
    const headers = Headers.read(cursor)
    const content = ContentWithBytes.read(cursor)

    return new HeadersAndContentWithBytes(headers, content)
  }

}

export interface HeadersInit {
  readonly cipher: Cipher
  readonly key: Unknown<ArrayBuffer>
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

  size(): number {
    return this.value.size()
  }

  write(cursor: Cursor<ArrayBuffer>) {
    this.value.write(cursor)
  }

  clone(): Headers {
    return Readable.readFromBytes(Headers, Writable.writeToBytes(this))
  }

  rotate(): Headers {
    const { cipher, binary } = this

    const key = new Unknown(crypto.getRandomValues(new Uint8Array(32)))

    return Headers.init({ cipher, key, binary })
  }

  async getCipher(): Promise<Cipher.ChaCha20> {
    return await this.cipher.init(this.key.bytes)
  }

}

export namespace Headers {

  export function create(cipher: Cipher) {
    const binary = new Array<Unknown<ArrayBuffer>>()

    const key = new Unknown(crypto.getRandomValues(new Uint8Array(32)))

    return Headers.init({ cipher, key, binary })
  }

  export function init(init: HeadersInit): Headers {
    const { cipher, key, binary } = init

    const indexed = {
      1: [cipher],
      2: [key],
      3: binary
    } as const

    return new Headers(Vector.init(indexed))
  }

  export function read(cursor: Cursor<ArrayBuffer>): Headers {
    const vector = Vector.read(cursor)

    if (vector.value[1].length !== 1)
      throw new Error()
    if (vector.value[2].length !== 1)
      throw new Error()

    const indexed = {
      1: [vector.value[1][0].into(Cipher)],
      2: [vector.value[2][0]],
      3: vector.value[3]
    } as const

    return new Headers(new Vector(vector.bytes, indexed))
  }

}

