export * from "./dictionary/index.js"
export * from "./headers/index.js"

import { Writable } from "@hazae41/binary"
import { Cursor } from "@hazae41/cursor"
import { Copiable, Uncopied } from "@hazae41/uncopy"
import { Uint8Array } from "libs/bytes/index.js"
import { Headers, HeadersWithBytes, HeadersWithHashAndHmac } from "./headers/outer/index.js"
import { HmacKey } from "./hmac/index.js"

export class Database {

  constructor(
    readonly head: Head,
    readonly body: BlockWithIndex[]
  ) { }

  async verifyOrThrow(masterHmacKeyBytes: Uint8Array) {
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

export class Head {

  constructor(
    readonly version: Version,
    readonly headers: HeadersWithHashAndHmac,
  ) { }

  async verifyOrThrow(masterHmacKeyBytes: Uint8Array) {
    return await this.headers.verifyOrThrow(masterHmacKeyBytes)
  }

}

export class Version {

  constructor(
    readonly major: number,
    readonly minor: number,
  ) { }

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
    const alg = { name: "AES-CBC", iv: database.head.headers.data.value.iv.get() }
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

  async verifyOrThrow(masterHmacKeyBytes: Uint8Array) {
    const index = this.index
    const major = new Uncopied(masterHmacKeyBytes as Uint8Array<32>)

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
    const start = cursor.offset

    const alpha = cursor.readUint32OrThrow(true)

    if (alpha !== 0x9AA2D903)
      throw new Error()

    const beta = cursor.readUint32OrThrow(true)

    if (beta !== 0xB54BFB67)
      throw new Error()

    const minor = cursor.readUint16OrThrow(true)
    const major = cursor.readUint16OrThrow(true)

    const version = new Version(major, minor)

    if (major !== 4)
      throw new Error()

    const value = Headers.readOrThrow(cursor)
    const bytes = new Uncopied(cursor.bytes.subarray(start, cursor.offset))

    const data = new HeadersWithBytes(value, bytes)
    const hash = cursor.readOrThrow(32)
    const hmac = cursor.readOrThrow(32)

    const headers = new HeadersWithHashAndHmac(data, hash, hmac)

    const body = new Array<BlockWithIndex>()

    for (let index = 0n; true; index++) {
      const block = Block.readOrThrow(cursor)

      if (block.data.get().length === 0)
        break

      body.push(new BlockWithIndex(index, block))

      continue
    }

    const head = new Head(version, headers)

    return new Database(head, body)
  }

}

