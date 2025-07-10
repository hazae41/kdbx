export * from "./dictionary/index.js"
export * from "./headers/index.js"

import { Base64 } from "@hazae41/base64"
import { Opaque, Readable, Writable } from "@hazae41/binary"
import { Cursor } from "@hazae41/cursor"
import { Lengthed } from "@hazae41/lengthed"
import { gunzipSync, gzipSync } from "node:zlib"
import { Inner, Outer } from "./headers/index.js"
import { Compression, MagicAndVersionAndHeadersWithBytesWithHashAndHmac } from "./headers/outer/index.js"
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
      readonly outer: Outer.MagicAndVersionAndHeadersWithBytesWithHashAndHmacWithKeys,
      readonly inner: Inner.HeadersAndContentWithBytes
    ) { }

    async rotateOrThrow(composite: CompositeKey) {
      return new Decrypted(await this.outer.rotateOrThrow(composite), await this.inner.rotateOrThrow())
    }

    async encryptOrThrow() {
      const cipher = await this.inner.headers.getCipherOrThrow()

      const $$values = this.inner.content.value.document.querySelectorAll("Value[Protected='True']")

      for (let i = 0; i < $$values.length; i++) {
        const $value = $$values[i]

        const decrypted = new TextEncoder().encode($value.innerHTML)
        const encrypted = cipher.applyOrThrow(decrypted)

        $value.innerHTML = Base64.get().getOrThrow().encodePaddedOrThrow(encrypted)
      }

      {
        const { cipher, iv, compression } = this.outer.data.data.value.headers

        const degzipped = Writable.writeToBytesOrThrow(this.inner.recomputeOrThrow())

        const engzipped = compression === Compression.Gzip ? new Uint8Array(gzipSync(degzipped)) : degzipped
        const encrypted = await cipher.encryptOrThrow(this.outer.keys.encrypter.value.bytes, iv.bytes, engzipped)

        const blocks = new Array<BlockWithIndex>()

        const cursor = new Cursor(encrypted)
        const splits = cursor.splitOrThrow(1048576)

        let index = 0n

        for (let x = splits.next(); true; index++, x = splits.next()) {
          if (x.done)
            break

          blocks.push(await BlockWithIndex.fromOrThrow(this.outer.keys, index, x.value))

          continue
        }

        blocks.push(await BlockWithIndex.fromOrThrow(this.outer.keys, index, new Uint8Array(0)))

        return new Encrypted(this.outer.data, new Blocks(blocks))
      }
    }

  }

  export class Encrypted {

    constructor(
      readonly outer: Outer.MagicAndVersionAndHeadersWithBytesWithHashAndHmac,
      readonly inner: Blocks
    ) { }

    sizeOrThrow() {
      return this.outer.sizeOrThrow() + this.inner.sizeOrThrow()
    }

    writeOrThrow(cursor: Cursor) {
      this.outer.writeOrThrow(cursor)
      this.inner.writeOrThrow(cursor)
    }

    cloneOrThrow() {
      return new Encrypted(this.outer.cloneOrThrow(), this.inner.cloneOrThrow())
    }

    async decryptOrThrow(composite: CompositeKey) {
      const { cipher, iv, compression } = this.outer.data.value.headers

      const keys = await this.outer.deriveOrThrow(composite)

      await this.outer.verifyOrThrow(keys)

      const length = this.inner.blocks.reduce((a, b) => a + b.block.data.bytes.length, 0)
      const cursor = new Cursor(new Uint8Array(length))

      for (const block of this.inner.blocks) {
        await block.verifyOrThrow(keys)

        cursor.writeOrThrow(block.block.data.bytes)

        continue
      }

      const decrypted = await cipher.decryptOrThrow(keys.encrypter.value.bytes, iv.bytes, cursor.bytes)
      const degzipped = compression === Compression.Gzip ? gunzipSync(decrypted) : decrypted

      const inner = Readable.readFromBytesOrThrow(Inner.HeadersAndContentWithBytes, degzipped)

      {
        const cipher = await inner.headers.getCipherOrThrow()

        const $$values = inner.content.value.document.querySelectorAll("Value[Protected='True']")

        for (let i = 0; i < $$values.length; i++) {
          const $value = $$values[i]

          const encrypted = Base64.get().getOrThrow().decodePaddedOrThrow($value.innerHTML).bytes
          const decrypted = cipher.applyOrThrow(encrypted)

          $value.innerHTML = new TextDecoder().decode(decrypted)
        }

        const outer = new Outer.MagicAndVersionAndHeadersWithBytesWithHashAndHmacWithKeys(this.outer, keys)

        return new Decrypted(outer, inner)
      }
    }

  }

  export namespace Encrypted {

    export function readOrThrow(cursor: Cursor) {
      const head = MagicAndVersionAndHeadersWithBytesWithHashAndHmac.readOrThrow(cursor)
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

  cloneOrThrow() {
    return new Blocks(this.blocks.map(block => block.cloneOrThrow()))
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
    readonly index: bigint,
    readonly block: Opaque,
  ) { }

  sizeOrThrow() {
    return 8 + 4 + this.block.bytes.length
  }

  writeOrThrow(cursor: Cursor) {
    cursor.writeUint64OrThrow(this.index, true)
    cursor.writeUint32OrThrow(this.block.bytes.length, true)
    cursor.writeOrThrow(this.block.bytes)
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

  cloneOrThrow() {
    return new BlockWithIndex(this.index, this.block.cloneOrThrow())
  }

  async verifyOrThrow(keys: MasterKeys) {
    const { index } = this

    const major = keys.authifier.bytes

    const key = await new PreHmacKey(index, major).digestOrThrow()

    const preimage = new BlockWithIndexPreHmacData(this.index, this.block.data)
    const prebytes = Writable.writeToBytesOrThrow(preimage)

    await key.verifyOrThrow(prebytes, this.block.hmac.bytes)
  }

}

export namespace BlockWithIndex {

  export async function fromOrThrow(keys: MasterKeys, index: bigint, data: Uint8Array) {
    const major = keys.authifier.bytes

    const key = await new PreHmacKey(index, major).digestOrThrow()

    const preimage = new BlockWithIndexPreHmacData(index, new Opaque(data))
    const prebytes = Writable.writeToBytesOrThrow(preimage)

    const hmac = new Opaque(await key.signOrThrow(prebytes) as Uint8Array & Lengthed<32>)

    const block = new Block(hmac, new Opaque(data))

    return new BlockWithIndex(index, block)
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

  cloneOrThrow() {
    return new Block(this.hmac.cloneOrThrow(), this.data.cloneOrThrow())
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

