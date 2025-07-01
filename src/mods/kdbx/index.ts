export * from "./dictionary/index.js"
export * from "./headers/index.js"

import { Readable, Writable } from "@hazae41/binary"
import { Cursor } from "@hazae41/cursor"
import { Copiable, Copied } from "@hazae41/uncopy"
import { Uint8Array } from "libs/bytes/index.js"
import { gunzipSync } from "node:zlib"
import { Inner, Outer } from "./headers/index.js"
import { Cipher, VersionAndHeadersWithHashAndHmac } from "./headers/outer/index.js"
import { PreHmacKey } from "./hmac/index.js"

export class PasswordKey {
  readonly #class = PasswordKey

  constructor(
    readonly bytes: Copiable<32>
  ) { }

  static async digestOrThrow(password: Uint8Array) {
    const array = await crypto.subtle.digest("SHA-256", password)
    const bytes = new Uint8Array(array) as Uint8Array<32>

    return new PasswordKey(new Copied(bytes))
  }

}

export class CompositeKey {
  readonly #class = CompositeKey

  constructor(
    readonly bytes: Copiable<32>,
  ) { }

  static async digestOrThrow(password: PasswordKey) {
    const array = await crypto.subtle.digest("SHA-256", password.bytes.get())
    const bytes = new Uint8Array(array) as Uint8Array<32>

    return new CompositeKey(new Copied(bytes))
  }

}

export class DerivedKey {
  readonly #class = DerivedKey

  constructor(
    readonly bytes: Copiable<32>
  ) { }

}

export class PreMasterKey {
  readonly #class = PreMasterKey

  constructor(
    readonly seed: Copiable<32>,
    readonly hash: DerivedKey
  ) { }

  sizeOrThrow() {
    return 32 + 32
  }

  writeOrThrow(cursor: Cursor) {
    cursor.writeOrThrow(this.seed.get())
    cursor.writeOrThrow(this.hash.bytes.get())
  }

  async digestOrThrow() {
    const input = Writable.writeToBytesOrThrow(this)

    const digest = await crypto.subtle.digest("SHA-256", input)
    const output = new Uint8Array(digest) as Uint8Array<32>

    return new MasterKey(new Copied(output))
  }

}

export class MasterKey {
  readonly #class = MasterKey

  constructor(
    readonly bytes: Copiable<32>,
  ) { }

}

export class PreHmacMasterKey {
  readonly #class = PreHmacMasterKey

  constructor(
    readonly seed: Copiable<32>,
    readonly hash: DerivedKey
  ) { }

  sizeOrThrow() {
    return 32 + 32 + 1
  }

  writeOrThrow(cursor: Cursor) {
    cursor.writeOrThrow(this.seed.get())
    cursor.writeOrThrow(this.hash.bytes.get())
    cursor.writeUint8OrThrow(1)
  }

  async digestOrThrow() {
    const input = Writable.writeToBytesOrThrow(this)

    const digest = await crypto.subtle.digest("SHA-512", input)
    const output = new Uint8Array(digest) as Uint8Array<64>

    return new HmacMasterKey(new Copied(output))
  }

}

export class HmacMasterKey {
  readonly #class = HmacMasterKey

  constructor(
    readonly bytes: Copiable<64>,
  ) { }

}

export namespace Database {

  export class Decrypted {

    constructor(
      readonly head: Outer.VersionAndHeadersWithHashAndHmac,
      readonly body: Inner.HeadersAndContent
    ) { }

  }

  export class Encrypted {

    constructor(
      readonly head: Outer.VersionAndHeadersWithHashAndHmac,
      readonly body: BlockWithIndex[]
    ) { }

    deriveOrThrow(composite: CompositeKey) {
      return this.head.data.value.headers.kdf.deriveOrThrow(composite)
    }

    async decryptOrThrow(derived: DerivedKey) {
      const seed = this.head.data.value.headers.seed

      const encrypter = await new PreMasterKey(seed, derived).digestOrThrow()
      const authifier = await new PreHmacMasterKey(seed, derived).digestOrThrow()

      await this.head.verifyOrThrow(authifier)

      if (this.head.data.value.headers.cipher === Cipher.Aes256Cbc) {
        const length = this.body.reduce((a, b) => a + b.block.data.get().length, 0)
        const cursor = new Cursor(new Uint8Array(length))

        const alg = { name: "AES-CBC", iv: this.head.data.value.headers.iv.get() }
        const key = await crypto.subtle.importKey("raw", encrypter.bytes.get(), { name: "AES-CBC" }, false, ["decrypt"])

        for (const block of this.body) {
          await block.verifyOrThrow(authifier)

          const encrypted = block.block.data.get()
          const decrypted = await crypto.subtle.decrypt(alg, key, encrypted)

          cursor.writeOrThrow(new Uint8Array(decrypted))
          continue
        }

        const body = Readable.readFromBytesOrThrow(Inner.HeadersAndContent, gunzipSync(cursor.bytes))

        return new Decrypted(this.head, body)
      }

      throw new Error()
    }

  }

  export namespace Encrypted {

    export function readOrThrow(cursor: Cursor) {
      const head = VersionAndHeadersWithHashAndHmac.readOrThrow(cursor)

      const body = new Array<BlockWithIndex>()

      for (let index = 0n; true; index++) {
        const block = Block.readOrThrow(cursor)

        if (block.data.get().length === 0)
          break

        body.push(new BlockWithIndex(index, block))

        continue
      }

      return new Encrypted(head, body)
    }

  }

}

export class BlockWithIndexPreHmacData {

  constructor(
    readonly block: BlockWithIndex,
  ) { }

  sizeOrThrow() {
    return 8 + 4 + this.block.block.data.get().length
  }

  writeOrThrow(cursor: Cursor) {
    cursor.writeUint64OrThrow(this.block.index, true)
    cursor.writeUint32OrThrow(this.block.block.data.get().length, true)
    cursor.writeOrThrow(this.block.block.data.get())
  }

}

export class BlockWithIndex {

  constructor(
    readonly index: bigint,
    readonly block: Block
  ) { }

  async verifyOrThrow(master: HmacMasterKey) {
    const index = this.index
    const major = master.bytes

    const key = await new PreHmacKey(index, major).digestOrThrow()

    const data = Writable.writeToBytesOrThrow(new BlockWithIndexPreHmacData(this))

    await key.verifyOrThrow(data, this.block.hmac.get())
  }

}

export class Block {

  constructor(
    readonly hmac: Copiable<32>,
    readonly data: Copiable
  ) { }

}

export namespace Block {

  export function readOrThrow(cursor: Cursor) {
    const hmac = cursor.readOrThrow(32)
    const size = cursor.readUint32OrThrow(true)
    const data = cursor.readOrThrow(size)

    return new Block(hmac, data)
  }

}

