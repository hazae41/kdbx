export * from "./dictionary/index.js";
export * from "./header/index.js";

import { Readable } from "@hazae41/binary";
import { Cursor } from "@hazae41/cursor";
import { Copiable, Uncopied } from "@hazae41/uncopy";
import { TLV } from "libs/tlv/index.js";
import { StringAsUuid } from "libs/uuid/index.js";
import { Bytes, Dictionary, UInt32, UInt64 } from "./dictionary/index.js";
import { Cipher, Compression } from "./header/outer/index.js";

export class Database {

  constructor(
    readonly head: Head,
    readonly body: Block[]
  ) { }

  async decryptOrThrow(cryptor: AesCbcCryptor) {
    const length = this.body.reduce((a, b) => a + b.data.get().length, 0)
    const cursor = new Cursor(new Uint8Array(length))

    for (const block of this.body) {
      const decrypted = await cryptor.decryptOrThrow(block.data.get())

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

    const body = new Array<Block>()

    while (true) {
      const block = Block.readOrThrow(cursor)

      if (block.data.get().length === 0)
        break

      body.push(block)

      continue
    }

    const head = new Head(version, headers)

    return new Database(head, body)
  }

}

export class HeadersWithHashAndHmac {

  constructor(
    readonly data: HeadersWithBytes,
    readonly hash: Copiable<32>,
    readonly hmac: Copiable<32>
  ) { }

}

export class HeadersWithBytes {

  constructor(
    readonly value: Headers,
    readonly bytes: Copiable,
  ) { }

}

export class Headers {

  constructor(
    readonly cipher: Cipher,
    readonly compression: Compression,
    readonly seed: Copiable,
    readonly iv: Copiable,
    readonly kdf: KdfParameters,
    readonly custom?: Dictionary
  ) { }

}

export namespace Headers {

  export function readOrThrow(cursor: Cursor) {
    const fields: {
      cipher?: Cipher,
      compression?: Compression
      seed?: Copiable
      iv?: Copiable
      kdf?: KdfParameters
      custom?: Dictionary
    } = {}

    while (true) {
      const tlv = TLV.readOrThrow(cursor)

      if (tlv.type === 0)
        break

      if (tlv.type === 2) {
        fields.cipher = Readable.readFromBytesOrThrow(Cipher, tlv.bytes.get())
        continue
      }

      if (tlv.type === 3) {
        fields.compression = Readable.readFromBytesOrThrow(Compression, tlv.bytes.get())
        continue
      }

      if (tlv.type === 4) {
        fields.seed = tlv.bytes
        continue
      }

      if (tlv.type === 7) {
        fields.iv = tlv.bytes
        continue
      }

      if (tlv.type === 11) {
        const dictionary = Readable.readFromBytesOrThrow(Dictionary, tlv.bytes.get())

        if (dictionary.value["$UUID"] instanceof Bytes === false)
          throw new Error()

        const $UUID = StringAsUuid.from(dictionary.value["$UUID"].value.get())

        if (![AesKdfParameters.$UUID, Argon2dKdfParameters.$UUID, Argon2idKdfParameters.$UUID].includes($UUID))
          throw new Error()

        if ($UUID === AesKdfParameters.$UUID) {
          if (dictionary.value["R"] instanceof UInt32 === false)
            throw new Error()
          const rounds = dictionary.value["R"].value

          if (dictionary.value["S"] instanceof Bytes === false)
            throw new Error()
          const seed = dictionary.value["S"].value as Copiable<32>

          fields.kdf = new AesKdfParameters(rounds, seed)

          continue
        }

        if ($UUID === Argon2dKdfParameters.$UUID) {
          if (dictionary.value["S"] instanceof Bytes === false)
            throw new Error()
          const salt = dictionary.value["S"].value as Copiable<32>

          if (dictionary.value["P"] instanceof UInt32 === false)
            throw new Error()
          const parallelism = dictionary.value["P"].value


          if (dictionary.value["M"] instanceof UInt64 === false)
            throw new Error()
          const memory = dictionary.value["M"].value

          if (dictionary.value["I"] instanceof UInt64 === false)
            throw new Error()
          const iterations = dictionary.value["I"].value

          if (dictionary.value["V"] instanceof UInt32 === false)
            throw new Error()
          const version = dictionary.value["V"].value as Argon2Version

          fields.kdf = new Argon2dKdfParameters(salt, parallelism, memory, iterations, version)

          continue
        }

        if ($UUID === Argon2idKdfParameters.$UUID) {
          if (dictionary.value["S"] instanceof Bytes === false)
            throw new Error()
          const salt = dictionary.value["S"].value as Copiable<32>

          if (dictionary.value["P"] instanceof UInt32 === false)
            throw new Error()
          const parallelism = dictionary.value["P"].value

          if (dictionary.value["M"] instanceof UInt64 === false)
            throw new Error()
          const memory = dictionary.value["M"].value

          if (dictionary.value["I"] instanceof UInt64 === false)
            throw new Error()
          const iterations = dictionary.value["I"].value

          if (dictionary.value["V"] instanceof UInt32 === false)
            throw new Error()
          const version = dictionary.value["V"].value as Argon2Version

          fields.kdf = new Argon2idKdfParameters(salt, parallelism, memory, iterations, version)

          continue
        }

        throw new Error()
      }

      if (tlv.type === 12) {
        fields.custom = Readable.readFromBytesOrThrow(Dictionary, tlv.bytes.get())
        continue
      }

      throw new Error()
    }

    if (fields.cipher == null)
      throw new Error()
    if (fields.compression == null)
      throw new Error()
    if (fields.seed == null)
      throw new Error()
    if (fields.iv == null)
      throw new Error()
    if (fields.kdf == null)
      throw new Error()

    const { cipher, compression, seed, iv, kdf, custom } = fields
    return new Headers(cipher, compression, seed, iv, kdf, custom)
  }
}

export class AesKdfParameters {

  constructor(
    readonly rounds: number,
    readonly seed: Copiable<32>,
  ) { }

}

export type KdfParameters =
  | AesKdfParameters
  | Argon2dKdfParameters
  | Argon2idKdfParameters

export namespace AesKdfParameters {

  export const $UUID = "c9d9f39a-628a-4460-bf74-0d08c18a4fea"

}

export type Argon2Version = 0x10 | 0x13

export class Argon2dKdfParameters {

  constructor(
    readonly salt: Copiable<32>,
    readonly parallelism: number,
    readonly memory: bigint,
    readonly iterations: bigint,
    readonly version: Argon2Version,
  ) { }

}

export namespace Argon2dKdfParameters {

  export const $UUID = "ef636ddf-8c29-444b-91f7-a9a403e30a0c"

}

export class Argon2idKdfParameters {

  constructor(
    readonly salt: Copiable<32>,
    readonly parallelism: number,
    readonly memory: bigint,
    readonly iterations: bigint,
    readonly version: Argon2Version,
  ) { }

}

export namespace Argon2idKdfParameters {

  export const $UUID = "9e298b19-56db-4773-b23d-fc3ec6f0a1e6"

}

export class Seed {

  constructor(
    readonly bytes: Copiable<32>
  ) { }

  static readOrThrow(cursor: Cursor) {
    return new Seed(cursor.readOrThrow(32))
  }

}