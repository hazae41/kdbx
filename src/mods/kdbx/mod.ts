export * from "./dictionary/mod.ts"
export * from "./headers/mod.ts"

import { gunzip, gzip } from "@/libs/gzip/mod.ts"
import type { Lengthed } from "@/libs/lengthed/mod.ts"
import { Readable, Writable } from "@hazae41/binary"
import { Cursor } from "@hazae41/cursor"
import { Opaque } from "../../libs/struct/mod.ts"
import { Inner, Outer } from "./headers/mod.ts"
import { Compression, MagicAndVersionAndHeadersWithBytesWithHashAndHmac } from "./headers/outer/mod.ts"
import { PreHmacKey } from "./hmac/mod.ts"

export class PasswordKey {
  readonly #class = PasswordKey

  constructor(
    readonly value: Opaque<ArrayBuffer, 32>,
  ) { }

  static async digestOrThrow(password: Uint8Array<ArrayBuffer>): Promise<PasswordKey> {
    const array = await crypto.subtle.digest("SHA-256", password)
    const bytes = new Uint8Array(array) as Uint8Array<ArrayBuffer> & Lengthed<32>

    return new PasswordKey(new Opaque(bytes))
  }

}

export class CompositeKey {
  readonly #class = CompositeKey

  constructor(
    readonly value: Opaque<ArrayBuffer, 32>,
  ) { }

  static async digestOrThrow(password: PasswordKey): Promise<CompositeKey> {
    const array = await crypto.subtle.digest("SHA-256", password.value.bytes)
    const bytes = new Uint8Array(array) as Uint8Array<ArrayBuffer> & Lengthed<32>

    return new CompositeKey(new Opaque(bytes))
  }

}

export class DerivedKey {
  readonly #class = DerivedKey

  constructor(
    readonly value: Opaque<ArrayBuffer, 32>
  ) { }

}

export class PreMasterKey {
  readonly #class = PreMasterKey

  constructor(
    readonly seed: Opaque<ArrayBuffer, 32>,
    readonly hash: DerivedKey
  ) { }

  sizeOrThrow(): number {
    return 32 + 32
  }

  writeOrThrow(cursor: Cursor<ArrayBuffer>) {
    cursor.writeOrThrow(this.seed.bytes)
    cursor.writeOrThrow(this.hash.value.bytes)
  }

  async digestOrThrow(): Promise<MasterKey> {
    const input = Writable.writeToBytesOrThrow(this)

    const digest = await crypto.subtle.digest("SHA-256", input)
    const output = new Uint8Array(digest) as Uint8Array<ArrayBuffer> & Lengthed<32>

    return new MasterKey(new Opaque(output))
  }

}

export class MasterKey {
  readonly #class = MasterKey

  constructor(
    readonly value: Opaque<ArrayBuffer, 32>,
  ) { }

}

export class PreHmacMasterKey {
  readonly #class = PreHmacMasterKey

  constructor(
    readonly seed: Opaque<ArrayBuffer, 32>,
    readonly hash: DerivedKey
  ) { }

  sizeOrThrow(): number {
    return 32 + 32 + 1
  }

  writeOrThrow(cursor: Cursor<ArrayBuffer>) {
    cursor.writeOrThrow(this.seed.bytes)
    cursor.writeOrThrow(this.hash.value.bytes)
    cursor.writeUint8OrThrow(1)
  }

  async digestOrThrow(): Promise<HmacMasterKey> {
    const input = Writable.writeToBytesOrThrow(this)

    const digest = await crypto.subtle.digest("SHA-512", input)
    const output = new Uint8Array(digest) as Uint8Array<ArrayBuffer> & Lengthed<64>

    return new HmacMasterKey(new Opaque(output))
  }

}

export class HmacMasterKey {
  readonly #class = HmacMasterKey

  constructor(
    readonly bytes: Opaque<ArrayBuffer, 64>,
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

    async rotateOrThrow(composite: CompositeKey): Promise<Decrypted> {
      return new Decrypted(await this.outer.rotateOrThrow(composite), this.inner.rotateOrThrow())
    }

    async encryptOrThrow(): Promise<Encrypted> {
      const cipher = await this.inner.headers.getCipherOrThrow()

      const $$values = this.inner.content.value.document.querySelectorAll("Value[Protected='True']")

      for (let i = 0; i < $$values.length; i++) {
        const $value = $$values[i]

        const decrypted = new TextEncoder().encode($value.innerHTML)
        using encrypted = cipher.applyOrThrow(decrypted)

        $value.innerHTML = encrypted.bytes.toBase64()
      }

      {
        const { cipher, iv, compression } = this.outer.data.data.value.headers

        const degzipped = Writable.writeToBytesOrThrow(this.inner.recomputeOrThrow())

        const engzipped = compression === Compression.Gzip ? new Uint8Array(await gzip(degzipped)) : degzipped
        const encrypted = await cipher.encryptOrThrow(this.outer.keys.encrypter.value.bytes, iv.bytes, engzipped)

        const blocks = new Array<BlockWithIndex>()

        const cursor = new Cursor(encrypted)
        const splits = cursor.splitOrThrow(1048576)

        let index = 0n

        for (let x = splits.next(); true; index++, x = splits.next()) {
          if (x.done === true)
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

    sizeOrThrow(): number {
      return this.outer.sizeOrThrow() + this.inner.sizeOrThrow()
    }

    writeOrThrow(cursor: Cursor<ArrayBuffer>) {
      this.outer.writeOrThrow(cursor)
      this.inner.writeOrThrow(cursor)
    }

    cloneOrThrow(): Encrypted {
      return new Encrypted(this.outer.cloneOrThrow(), this.inner.cloneOrThrow())
    }

    async decryptOrThrow(composite: CompositeKey): Promise<Decrypted> {
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
      const degzipped = compression === Compression.Gzip ? await gunzip(decrypted) : decrypted

      const inner = Readable.readFromBytesOrThrow(Inner.HeadersAndContentWithBytes, degzipped)

      {
        const cipher = await inner.headers.getCipherOrThrow()

        const $$values = inner.content.value.document.querySelectorAll("Value[Protected='True']")

        for (let i = 0; i < $$values.length; i++) {
          const $value = $$values[i]

          const encrypted = Uint8Array.fromBase64($value.innerHTML)
          using decrypted = cipher.applyOrThrow(encrypted)

          $value.innerHTML = new TextDecoder().decode(decrypted.bytes)
        }

        const outer = new Outer.MagicAndVersionAndHeadersWithBytesWithHashAndHmacWithKeys(this.outer, keys)

        return new Decrypted(outer, inner)
      }
    }

  }

  export namespace Encrypted {

    export function readOrThrow(cursor: Cursor<ArrayBuffer>): Encrypted {
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

  sizeOrThrow(): number {
    return this.blocks.reduce((a, b) => a + b.sizeOrThrow(), 0)
  }

  writeOrThrow(cursor: Cursor<ArrayBuffer>) {
    for (const block of this.blocks)
      block.writeOrThrow(cursor)
    return
  }

  cloneOrThrow(): Blocks {
    return new Blocks(this.blocks.map(block => block.cloneOrThrow()))
  }

}

export namespace Blocks {

  export function readOrThrow(cursor: Cursor<ArrayBuffer>): Blocks {
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
    readonly block: Opaque<ArrayBuffer>,
  ) { }

  sizeOrThrow(): number {
    return 8 + 4 + this.block.bytes.length
  }

  writeOrThrow(cursor: Cursor<ArrayBuffer>) {
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

  sizeOrThrow(): number {
    return this.block.sizeOrThrow()
  }

  writeOrThrow(cursor: Cursor<ArrayBuffer>) {
    this.block.writeOrThrow(cursor)
  }

  cloneOrThrow(): BlockWithIndex {
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

  export async function fromOrThrow(keys: MasterKeys, index: bigint, data: Uint8Array<ArrayBuffer>): Promise<BlockWithIndex> {
    const major = keys.authifier.bytes

    const key = await new PreHmacKey(index, major).digestOrThrow()

    const preimage = new BlockWithIndexPreHmacData(index, new Opaque(data))
    const prebytes = Writable.writeToBytesOrThrow(preimage)

    const hmac = new Opaque(await key.signOrThrow(prebytes) as Uint8Array<ArrayBuffer> & Lengthed<32>)

    const block = new Block(hmac, new Opaque(data))

    return new BlockWithIndex(index, block)
  }

}

export class Block {

  constructor(
    readonly hmac: Opaque<ArrayBuffer, 32>,
    readonly data: Opaque<ArrayBuffer>
  ) { }

  sizeOrThrow(): number {
    return 32 + 4 + this.data.bytes.length
  }

  writeOrThrow(cursor: Cursor<ArrayBuffer>) {
    cursor.writeOrThrow(this.hmac.bytes)
    cursor.writeUint32OrThrow(this.data.bytes.length, true)
    cursor.writeOrThrow(this.data.bytes)
  }

  cloneOrThrow(): Block {
    return new Block(this.hmac.cloneOrThrow(), this.data.cloneOrThrow())
  }

}

export namespace Block {

  export function readOrThrow(cursor: Cursor<ArrayBuffer>): Block {
    const hmac = new Opaque(cursor.readOrThrow(32))
    const size = cursor.readUint32OrThrow(true)
    const data = new Opaque(cursor.readOrThrow(size))

    return new Block(hmac, data)
  }

}

