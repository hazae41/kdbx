// deno-lint-ignore-file no-namespace

export * from "./dictionary/mod.ts"
export * from "./headers/mod.ts"

import { gunzip, gzip } from "@/libs/gzip/mod.ts"
import { Readable, Unknown, Writable } from "@hazae41/binary"
import { Cursor } from "@hazae41/cursor"
import { Cursors } from "../../libs/cursors/mod.ts"
import { ContentWithBytes } from "./headers/inner/mod.ts"
import { Inner, Outer } from "./headers/mod.ts"
import { Compression, MagicAndVersionAndHeadersWithBytesWithHashAndHmac } from "./headers/outer/mod.ts"
import { PreHmacKey } from "./hmac/mod.ts"

export class PasswordKey {
  readonly #class = PasswordKey

  constructor(
    readonly value: Unknown<ArrayBuffer>,
  ) { }

  static async digest(password: Uint8Array<ArrayBuffer>): Promise<PasswordKey> {
    const array = await crypto.subtle.digest("SHA-256", password)
    const bytes = new Uint8Array(array)

    return new PasswordKey(new Unknown(bytes))
  }

}

export class CompositeKey {
  readonly #class = CompositeKey

  constructor(
    readonly value: Unknown<ArrayBuffer>,
  ) { }

  static async digest(password: PasswordKey): Promise<CompositeKey> {
    const array = await crypto.subtle.digest("SHA-256", password.value.bytes)
    const bytes = new Uint8Array(array)

    return new CompositeKey(new Unknown(bytes))
  }

}

export class DerivedKey {
  readonly #class = DerivedKey

  constructor(
    readonly value: Unknown<ArrayBuffer>
  ) { }

}

export class PreMasterKey {
  readonly #class = PreMasterKey

  constructor(
    readonly seed: Unknown<ArrayBuffer>,
    readonly hash: DerivedKey
  ) { }

  size(): number {
    return 32 + 32
  }

  write(cursor: Cursor<ArrayBuffer>) {
    cursor.write(this.seed.bytes)
    cursor.write(this.hash.value.bytes)
  }

  async digest(): Promise<MasterKey> {
    const input = Writable.writeToBytes(this)

    const digest = await crypto.subtle.digest("SHA-256", input)
    const output = new Uint8Array(digest)

    return new MasterKey(new Unknown(output))
  }

}

export class MasterKey {
  readonly #class = MasterKey

  constructor(
    readonly value: Unknown<ArrayBuffer>,
  ) { }

}

export class PreHmacMasterKey {
  readonly #class = PreHmacMasterKey

  constructor(
    readonly seed: Unknown<ArrayBuffer>,
    readonly hash: DerivedKey
  ) { }

  size(): number {
    return 32 + 32 + 1
  }

  write(cursor: Cursor<ArrayBuffer>) {
    cursor.write(this.seed.bytes)
    cursor.write(this.hash.value.bytes)
    cursor.writeUint8(1)
  }

  async digest(): Promise<HmacMasterKey> {
    const input = Writable.writeToBytes(this)

    const digest = await crypto.subtle.digest("SHA-512", input)
    const output = new Uint8Array(digest)

    return new HmacMasterKey(new Unknown(output))
  }

}

export class HmacMasterKey {
  readonly #class = HmacMasterKey

  constructor(
    readonly bytes: Unknown<ArrayBuffer>,
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

    async encrypt(composite: CompositeKey): Promise<Encrypted> {
      const headers = this.inner.headers.rotate()

      const $file = this.inner.content.value.clone()
      const $list = $file.document.querySelectorAll<HTMLElement>("Value[Protected='True']")

      const cipher = await headers.getCipher()

      for (let i = 0; i < $list.length; i++) {
        const $value = $list[i]

        const decrypted = new TextEncoder().encode($value.textContent)
        const encrypted = cipher.feed(decrypted)

        $value.textContent = encrypted.toBase64()
      }

      const content = ContentWithBytes.compute($file)

      const inner = new Inner.HeadersAndContentWithBytes(headers, content)
      const outer = await this.outer.rotate(composite)

      {
        const { cipher, iv, compression } = outer.data.data.value.headers

        const degzipped = Writable.writeToBytes(inner)

        const engzipped = compression === Compression.Gzip ? new Uint8Array(await gzip(degzipped)) : degzipped
        const encrypted = await cipher.encrypt(outer.keys.encrypter.value.bytes, iv.bytes, engzipped)

        const blocks = new Array<BlockWithIndex>()

        const cursor = new Cursor(encrypted)
        const splits = Cursors.split(cursor, 1048576)

        let index = 0n

        for (let x = splits.next(); true; index++, x = splits.next()) {
          if (x.done === true)
            break

          blocks.push(await BlockWithIndex.from(outer.keys, index, x.value))

          continue
        }

        blocks.push(await BlockWithIndex.from(outer.keys, index, new Uint8Array(0)))

        return new Encrypted(outer.data, new Blocks(blocks))
      }
    }

  }

  export class Encrypted {

    constructor(
      readonly outer: Outer.MagicAndVersionAndHeadersWithBytesWithHashAndHmac,
      readonly inner: Blocks
    ) { }

    size(): number {
      return this.outer.size() + this.inner.size()
    }

    write(cursor: Cursor<ArrayBuffer>) {
      this.outer.write(cursor)
      this.inner.write(cursor)
    }

    async decrypt(composite: CompositeKey): Promise<Decrypted> {
      const { cipher, iv, compression } = this.outer.data.value.headers

      const keys = await this.outer.derive(composite)

      await this.outer.verify(keys)

      const length = this.inner.blocks.reduce((a, b) => a + b.block.data.bytes.length, 0)
      const cursor = new Cursor(new Uint8Array(length))

      for (const block of this.inner.blocks) {
        await block.verify(keys)

        cursor.write(block.block.data.bytes)

        continue
      }

      const decrypted = await cipher.decrypt(keys.encrypter.value.bytes, iv.bytes, cursor.bytes)
      const degzipped = compression === Compression.Gzip ? await gunzip(decrypted) : decrypted

      const inner = Readable.readFromBytes(Inner.HeadersAndContentWithBytes, degzipped)
      const outer = new Outer.MagicAndVersionAndHeadersWithBytesWithHashAndHmacWithKeys(this.outer, keys)

      {
        const cipher = await inner.headers.getCipher()

        const $list = inner.content.value.document.querySelectorAll<HTMLElement>("Value[Protected='True']")

        for (let i = 0; i < $list.length; i++) {
          const $value = $list[i]

          const encrypted = Uint8Array.fromBase64($value.textContent)
          const decrypted = cipher.feed(encrypted)

          $value.textContent = new TextDecoder().decode(decrypted)
        }

        return new Decrypted(outer, inner)
      }
    }

  }

  export namespace Encrypted {

    export function read(cursor: Cursor<ArrayBuffer>): Encrypted {
      const head = MagicAndVersionAndHeadersWithBytesWithHashAndHmac.read(cursor)
      const body = Blocks.read(cursor)

      return new Encrypted(head, body)
    }

  }

}

export class Blocks {

  constructor(
    readonly blocks: BlockWithIndex[]
  ) { }

  size(): number {
    return this.blocks.reduce((a, b) => a + b.size(), 0)
  }

  write(cursor: Cursor<ArrayBuffer>) {
    for (const block of this.blocks)
      block.write(cursor)
    return
  }

  clone(): Blocks {
    return new Blocks(this.blocks.map(block => block.clone()))
  }

}

export namespace Blocks {

  export function read(cursor: Cursor<ArrayBuffer>): Blocks {
    const blocks = new Array<BlockWithIndex>()

    for (let index = 0n; true; index++) {
      const block = Block.read(cursor)

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
    readonly block: Unknown<ArrayBuffer>,
  ) { }

  size(): number {
    return 8 + 4 + this.block.bytes.length
  }

  write(cursor: Cursor<ArrayBuffer>) {
    cursor.writeBigUint64(this.index, true)
    cursor.writeUint32(this.block.bytes.length, true)
    cursor.write(this.block.bytes)
  }

}

export class BlockWithIndex {

  constructor(
    readonly index: bigint,
    readonly block: Block
  ) { }

  size(): number {
    return this.block.size()
  }

  write(cursor: Cursor<ArrayBuffer>) {
    this.block.write(cursor)
  }

  clone(): BlockWithIndex {
    return new BlockWithIndex(this.index, this.block.clone())
  }

  async verify(keys: MasterKeys) {
    const { index } = this

    const major = keys.authifier.bytes

    const key = await new PreHmacKey(index, major).digest()

    const preimage = new BlockWithIndexPreHmacData(this.index, this.block.data)
    const prebytes = Writable.writeToBytes(preimage)

    await key.verify(prebytes, this.block.hmac.bytes)
  }

}

export namespace BlockWithIndex {

  export async function from(keys: MasterKeys, index: bigint, data: Uint8Array<ArrayBuffer>): Promise<BlockWithIndex> {
    const major = keys.authifier.bytes

    const key = await new PreHmacKey(index, major).digest()

    const preimage = new BlockWithIndexPreHmacData(index, new Unknown(data))
    const prebytes = Writable.writeToBytes(preimage)

    const hmac = new Unknown(await key.sign(prebytes))

    const block = new Block(hmac, new Unknown(data))

    return new BlockWithIndex(index, block)
  }

}

export class Block {

  constructor(
    readonly hmac: Unknown<ArrayBuffer>,
    readonly data: Unknown<ArrayBuffer>
  ) { }

  size(): number {
    return 32 + 4 + this.data.bytes.length
  }

  write(cursor: Cursor<ArrayBuffer>) {
    cursor.write(this.hmac.bytes)
    cursor.writeUint32(this.data.bytes.length, true)
    cursor.write(this.data.bytes)
  }

  clone(): Block {
    return new Block(this.hmac.clone(), this.data.clone())
  }

}

export namespace Block {

  export function read(cursor: Cursor<ArrayBuffer>): Block {
    const hmac = new Unknown(cursor.read(32))
    const size = cursor.readUint32(true)
    const data = new Unknown(cursor.read(size))

    return new Block(hmac, data)
  }

}

