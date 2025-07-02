export * from "./dictionary/index.js"
export * from "./headers/index.js"

import { Opaque, Readable, Writable } from "@hazae41/binary"
import { Cursor } from "@hazae41/cursor"
import { Lengthed } from "@hazae41/lengthed"
import { gunzipSync } from "node:zlib"
import { Inner, Outer } from "./headers/index.js"
import { Cipher, MagicAndVersionAndHeadersWithHashAndHmac } from "./headers/outer/index.js"
import { PreHmacKey } from "./hmac/index.js"

export class PasswordKey {
  readonly #class = PasswordKey

  constructor(
    readonly value: Opaque<32>
  ) { }

  static async digestOrThrow(password: Uint8Array) {
    const array = await crypto.subtle.digest("SHA-256", password)
    const bytes = new Uint8Array(array) as Uint8Array & Lengthed<32>

    return new PasswordKey(new Opaque(bytes))
  }

}

export class CompositeKey {
  readonly #class = CompositeKey

  constructor(
    readonly value: Opaque<32>,
  ) { }

  static async digestOrThrow(password: PasswordKey) {
    const array = await crypto.subtle.digest("SHA-256", password.value.bytes)
    const bytes = new Uint8Array(array) as Uint8Array & Lengthed<32>

    return new CompositeKey(new Opaque(bytes))
  }

}

export class DerivedKey {
  readonly #class = DerivedKey

  constructor(
    readonly value: Opaque<32>
  ) { }

}

export class PreMasterKey {
  readonly #class = PreMasterKey

  constructor(
    readonly seed: Opaque<32>,
    readonly hash: DerivedKey
  ) { }

  sizeOrThrow() {
    return 32 + 32
  }

  writeOrThrow(cursor: Cursor) {
    cursor.writeOrThrow(this.seed.bytes)
    cursor.writeOrThrow(this.hash.value.bytes)
  }

  async digestOrThrow() {
    const input = Writable.writeToBytesOrThrow(this)

    const digest = await crypto.subtle.digest("SHA-256", input)
    const output = new Uint8Array(digest) as Uint8Array & Lengthed<32>

    return new MasterKey(new Opaque(output))
  }

}

export class MasterKey {
  readonly #class = MasterKey

  constructor(
    readonly value: Opaque<32>,
  ) { }

}

export class PreHmacMasterKey {
  readonly #class = PreHmacMasterKey

  constructor(
    readonly seed: Opaque<32>,
    readonly hash: DerivedKey
  ) { }

  sizeOrThrow() {
    return 32 + 32 + 1
  }

  writeOrThrow(cursor: Cursor) {
    cursor.writeOrThrow(this.seed.bytes)
    cursor.writeOrThrow(this.hash.value.bytes)
    cursor.writeUint8OrThrow(1)
  }

  async digestOrThrow() {
    const input = Writable.writeToBytesOrThrow(this)

    const digest = await crypto.subtle.digest("SHA-512", input)
    const output = new Uint8Array(digest) as Uint8Array & Lengthed<64>

    return new HmacMasterKey(new Opaque(output))
  }

}

export class HmacMasterKey {
  readonly #class = HmacMasterKey

  constructor(
    readonly bytes: Opaque<64>,
  ) { }

}

export class MasterKeys {
  readonly #class = MasterKeys

  constructor(
    readonly encrypter: MasterKey,
    readonly authifier: HmacMasterKey
  ) { }

}

export namespace Database {

  export class Decrypted {

    constructor(
      readonly head: Outer.MagicAndVersionAndHeadersWithHashAndHmac,
      readonly body: Inner.HeadersAndContent
    ) { }

  }

  export class Encrypted {

    constructor(
      readonly head: Outer.MagicAndVersionAndHeadersWithHashAndHmac,
      readonly body: Blocks
    ) { }

    sizeOrThrow() {
      return this.head.sizeOrThrow() + this.body.sizeOrThrow()
    }

    writeOrThrow(cursor: Cursor) {
      this.head.writeOrThrow(cursor)
      this.body.writeOrThrow(cursor)
    }

    deriveOrThrow(composite: CompositeKey) {
      return this.head.deriveOrThrow(composite)
    }

    async digestOrThrow(derived: DerivedKey) {
      return await this.head.digestOrThrow(derived)
    }

    async decryptOrThrow(keys: MasterKeys) {
      await this.head.verifyOrThrow(keys)

      if (this.head.data.value.headers.cipher === Cipher.Aes256Cbc) {
        const length = this.body.blocks.reduce((a, b) => a + b.block.data.bytes.length, 0)
        const cursor = new Cursor(new Uint8Array(length))

        for (const block of this.body.blocks) {
          await block.verifyOrThrow(keys)

          cursor.writeOrThrow(block.block.data.bytes)

          continue
        }

        const alg = { name: "AES-CBC", iv: this.head.data.value.headers.iv.bytes }
        const key = await crypto.subtle.importKey("raw", keys.encrypter.value.bytes, { name: "AES-CBC" }, false, ["decrypt"])

        const decrypted = await crypto.subtle.decrypt(alg, key, cursor.bytes)
        const degzipped = gunzipSync(decrypted)

        const body = Readable.readFromBytesOrThrow(Inner.HeadersAndContent, degzipped)

        return new Decrypted(this.head, body)
      }

      throw new Error()
    }

  }

  export namespace Encrypted {

    export function readOrThrow(cursor: Cursor) {
      const head = MagicAndVersionAndHeadersWithHashAndHmac.readOrThrow(cursor)
      const body = Blocks.readOrThrow(cursor)

      return new Encrypted(head, body)
    }

  }

}

export class Blocks {

  constructor(
    readonly blocks: BlockWithIndex[]
  ) { }

  sizeOrThrow() {
    return this.blocks.reduce((a, b) => a + b.sizeOrThrow(), 0)
  }

  writeOrThrow(cursor: Cursor) {
    for (const block of this.blocks)
      block.writeOrThrow(cursor)
    return
  }

}

export namespace Blocks {

  export function readOrThrow(cursor: Cursor) {
    const blocks = new Array<BlockWithIndex>()

    for (let index = 0n; true; index++) {
      const block = Block.readOrThrow(cursor)

      blocks.push(new BlockWithIndex(index, block))

      if (block.data.bytes.length === 0)
        break

      continue
    }

    return new Blocks(blocks)
  }

}

export class BlockWithIndexPreHmacData {

  constructor(
    readonly block: BlockWithIndex,
  ) { }

  sizeOrThrow() {
    return 8 + 4 + this.block.block.data.bytes.length
  }

  writeOrThrow(cursor: Cursor) {
    cursor.writeUint64OrThrow(this.block.index, true)
    cursor.writeUint32OrThrow(this.block.block.data.bytes.length, true)
    cursor.writeOrThrow(this.block.block.data.bytes)
  }

}

export class BlockWithIndex {

  constructor(
    readonly index: bigint,
    readonly block: Block
  ) { }

  sizeOrThrow() {
    return this.block.sizeOrThrow()
  }

  writeOrThrow(cursor: Cursor) {
    this.block.writeOrThrow(cursor)
  }

  async verifyOrThrow(keys: MasterKeys) {
    const index = this.index
    const major = keys.authifier.bytes

    const key = await new PreHmacKey(index, major).digestOrThrow()

    const data = Writable.writeToBytesOrThrow(new BlockWithIndexPreHmacData(this))

    await key.verifyOrThrow(data, this.block.hmac.bytes)
  }

}

export class Block {

  constructor(
    readonly hmac: Opaque<32>,
    readonly data: Opaque
  ) { }

  sizeOrThrow() {
    return 32 + 4 + this.data.bytes.length
  }

  writeOrThrow(cursor: Cursor) {
    cursor.writeOrThrow(this.hmac.bytes)
    cursor.writeUint32OrThrow(this.data.bytes.length, true)
    cursor.writeOrThrow(this.data.bytes)
  }

}

export namespace Block {

  export function readOrThrow(cursor: Cursor) {
    const hmac = new Opaque(cursor.readOrThrow(32))
    const size = cursor.readUint32OrThrow(true)
    const data = new Opaque(cursor.readOrThrow(size))

    return new Block(hmac, data)
  }

}

