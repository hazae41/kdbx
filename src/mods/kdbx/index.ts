export * from "./dictionary/index.js"
export * from "./headers/index.js"

import { Readable, Writable } from "@hazae41/binary"
import { Cursor } from "@hazae41/cursor"
import { Copiable, Copied } from "@hazae41/uncopy"
import { Uint8Array } from "libs/bytes/index.js"
import { gunzipSync } from "node:zlib"
import { Inner, Outer } from "./headers/index.js"
import { Cipher, VersionAndHeadersWithHashAndHmac } from "./headers/outer/index.js"
import { HmacKey } from "./hmac/index.js"

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

export class MasterKeys {

  constructor(
    readonly encryption: Copiable,
    readonly authentication: Copiable<64>
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

    async decryptOrThrow(derived: DerivedKey) {
      const masterSeedCopiable = this.head.data.value.headers.seed

      const preMasterKeyBytes = new Uint8Array(masterSeedCopiable.get().length + derived.bytes.get().length)
      const preMasterKeyCursor = new Cursor(preMasterKeyBytes)
      preMasterKeyCursor.writeOrThrow(masterSeedCopiable.get())
      preMasterKeyCursor.writeOrThrow(derived.bytes.get())

      const masterKeyBuffer = await crypto.subtle.digest("SHA-256", preMasterKeyBytes)
      const masterKeyBytes = new Uint8Array(masterKeyBuffer) as Uint8Array<32>

      const preMasterHmacKeyBytes = new Uint8Array(masterSeedCopiable.get().length + derived.bytes.get().length + 1)
      const preMasterHmacKeyCursor = new Cursor(preMasterHmacKeyBytes)
      preMasterHmacKeyCursor.writeOrThrow(masterSeedCopiable.get())
      preMasterHmacKeyCursor.writeOrThrow(derived.bytes.get())
      preMasterHmacKeyCursor.writeUint8OrThrow(1)

      const masterHmacKeyBuffer = await crypto.subtle.digest("SHA-512", preMasterHmacKeyBytes)
      const masterHmacKeyBytes = new Uint8Array(masterHmacKeyBuffer) as Uint8Array<64>

      await this.head.verifyOrThrow(masterHmacKeyBytes)

      if (this.head.data.value.headers.cipher === Cipher.Aes256Cbc) {
        const length = this.body.reduce((a, b) => a + b.block.data.get().length, 0)
        const cursor = new Cursor(new Uint8Array(length))

        const alg = { name: "AES-CBC", iv: this.head.data.value.headers.iv.get() }
        const key = await crypto.subtle.importKey("raw", masterKeyBytes, { name: "AES-CBC" }, false, ["decrypt"])

        for (const block of this.body) {
          await block.verifyOrThrow(masterHmacKeyBytes)

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

  async verifyOrThrow(masterHmacKeyBytes: Uint8Array<64>) {
    const index = this.index
    const major = masterHmacKeyBytes

    const key = await HmacKey.digestOrThrow(index, major)

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

