export * from "./dictionary/index.js"
export * from "./headers/index.js"

import { Writable } from "@hazae41/binary"
import { Cursor } from "@hazae41/cursor"
import { Copiable } from "@hazae41/uncopy"
import { Uint8Array } from "libs/bytes/index.js"
import { VersionAndHeadersWithHashAndHmac } from "./headers/outer/index.js"
import { HmacKey } from "./hmac/index.js"

export class Database {

  constructor(
    readonly head: VersionAndHeadersWithHashAndHmac,
    readonly body: BlockWithIndex[]
  ) { }

  async verifyOrThrow(masterHmacKeyBytes: Uint8Array<32>) {
    const result = await this.head.verifyOrThrow(masterHmacKeyBytes)

    if (result !== true)
      throw new Error()

    for (const block of this.body) {
      const result = await block.verifyOrThrow(masterHmacKeyBytes)

      if (result !== true)
        throw new Error()

      continue
    }

    return true
  }

  async decryptOrThrow(cryptor: AesCbcCryptor) {
    const length = this.body.reduce((a, b) => a + b.block.data.get().length, 0)
    const cursor = new Cursor(new Uint8Array(length))

    for (const block of this.body) {
      const decrypted = await cryptor.decryptOrThrow(block.block.data.get())

      cursor.writeOrThrow(new Uint8Array(decrypted))

      continue
    }

    return cursor.bytes
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

  export async function importOrThrow(database: Database, master: Uint8Array) {
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

  async verifyOrThrow(masterHmacKeyBytes: Uint8Array<32>) {
    const index = this.index
    const major = masterHmacKeyBytes

    const key = await HmacKey.digestOrThrow(index, major)

    const data = Writable.writeToBytesOrThrow(new BlockWithIndexPreHmacData(this))

    const result = await key.verifyOrThrow(data, this.block.hmac.get())

    if (result !== true)
      throw new Error()

    return true
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

export namespace Database {

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

    return new Database(head, body)
  }

}

