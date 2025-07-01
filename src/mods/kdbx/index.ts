export * from "./dictionary/index.js"
export * from "./headers/index.js"

import { Argon2 } from "@hazae41/argon2.wasm"
import { Readable, Writable } from "@hazae41/binary"
import { Cursor } from "@hazae41/cursor"
import { Copiable, Copied } from "@hazae41/uncopy"
import { Uint8Array } from "libs/bytes/index.js"
import { gunzipSync } from "node:zlib"
import { Inner, Outer } from "./headers/index.js"
import { Cipher, KdfParameters, VersionAndHeadersWithHashAndHmac } from "./headers/outer/index.js"
import { HmacKey } from "./hmac/index.js"

export class PasswordKey {

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

  constructor(
    readonly bytes: Copiable<32>,
  ) { }

  static async digestOrThrow(password: PasswordKey) {
    const array = await crypto.subtle.digest("SHA-256", password.bytes.get())
    const bytes = new Uint8Array(array) as Uint8Array<32>

    return new CompositeKey(new Copied(bytes))
  }

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

    async decryptOrThrow(key: CompositeKey) {
      if (this.head.data.value.headers.kdf instanceof KdfParameters.Argon2d) {
        const { version, iterations, parallelism, memory, salt } = this.head.data.value.headers.kdf

        const masterSeedCopiable = this.head.data.value.headers.seed

        const deriverPointer = new Argon2.Argon2Deriver("argon2d", version, Number(memory) / 1024, Number(iterations), parallelism)
        const derivedMemoryPointer = deriverPointer.derive(new Argon2.Memory(key.bytes.get()), new Argon2.Memory(salt.get()))

        const preMasterKeyBytes = new Uint8Array(masterSeedCopiable.get().length + derivedMemoryPointer.bytes.length)
        const preMasterKeyCursor = new Cursor(preMasterKeyBytes)
        preMasterKeyCursor.writeOrThrow(masterSeedCopiable.get())
        preMasterKeyCursor.writeOrThrow(derivedMemoryPointer.bytes)

        const masterKeyBuffer = await crypto.subtle.digest("SHA-256", preMasterKeyBytes)
        const masterKeyBytes = new Uint8Array(masterKeyBuffer) as Uint8Array<32>

        const preMasterHmacKeyBytes = new Uint8Array(masterSeedCopiable.get().length + derivedMemoryPointer.bytes.length + 1)
        const preMasterHmacKeyCursor = new Cursor(preMasterHmacKeyBytes)
        preMasterHmacKeyCursor.writeOrThrow(masterSeedCopiable.get())
        preMasterHmacKeyCursor.writeOrThrow(derivedMemoryPointer.bytes)
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

export class AesCbcCryptor {

  constructor(
    readonly alg: AesCbcParams,
    readonly key: CryptoKey
  ) { }

  async decryptOrThrow(cipherbytes: Uint8Array) {
    return await crypto.subtle.decrypt(this.alg, this.key, cipherbytes)
  }

}

export namespace AesCbcCryptor {

  export async function importOrThrow(database: Database.Encrypted, master: Uint8Array) {
    const alg = { name: "AES-CBC", iv: database.head.data.value.headers.iv.get() }
    const key = await crypto.subtle.importKey("raw", master, { name: "AES-CBC" }, false, ["decrypt"])

    return new AesCbcCryptor(alg, key)
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

