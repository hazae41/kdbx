export * from "./cipher/index.js"
export * from "./compression/index.js"

import { Readable } from "@hazae41/binary"
import { Cursor } from "@hazae41/cursor"
import { Copiable, Uncopied } from "@hazae41/uncopy"
import { Bytes, Uint8Array } from "libs/bytes/index.js"
import { TLV } from "libs/tlv/index.js"
import { StringAsUuid } from "libs/uuid/index.js"
import { Dictionary, Value } from "mods/kdbx/dictionary/index.js"
import { HmacKey } from "mods/kdbx/hmac/index.js"
import { Cipher } from "./cipher/index.js"
import { Compression } from "./compression/index.js"

export class Version {

  constructor(
    readonly major: number,
    readonly minor: number,
  ) { }

}


export class VersionAndHeadersWithHashAndHmac {

  constructor(
    readonly data: VersionAndHeadersWithBytes,
    readonly hash: Copiable<32>,
    readonly hmac: Copiable<32>
  ) { }

  async verifyOrThrow(masterHmacKeyBytes: Uint8Array<32>): Promise<true> {
    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", this.data.bytes.get()))

    if (!Bytes.equals(hash, this.hash.get()))
      throw new Error()

    const index = 0xFFFFFFFFFFFFFFFFn
    const major = masterHmacKeyBytes

    const key = await HmacKey.digestOrThrow(index, major)

    const result = await key.verifyOrThrow(this.data.bytes.get(), this.hmac.get())

    if (result !== true)
      throw new Error()

    return true
  }

}

export namespace VersionAndHeadersWithHashAndHmac {

  export function readOrThrow(cursor: Cursor) {
    const data = VersionAndHeadersWithBytes.readOrThrow(cursor)
    const hash = cursor.readOrThrow(32)
    const hmac = cursor.readOrThrow(32)

    return new VersionAndHeadersWithHashAndHmac(data, hash, hmac)
  }

}

export class VersionAndHeadersWithBytes {

  constructor(
    readonly value: VersionAndHeaders,
    readonly bytes: Copiable,
  ) { }

}

export namespace VersionAndHeadersWithBytes {

  export function readOrThrow(cursor: Cursor) {
    const start = cursor.offset

    const value = VersionAndHeaders.readOrThrow(cursor)
    const bytes = new Uncopied(cursor.bytes.subarray(start, cursor.offset))

    return new VersionAndHeadersWithBytes(value, bytes)
  }

}

export class VersionAndHeaders {

  constructor(
    readonly version: Version,
    readonly headers: Headers
  ) { }

}

export namespace VersionAndHeaders {

  export function readOrThrow(cursor: Cursor) {
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

    const headers = Headers.readOrThrow(cursor)

    return new VersionAndHeaders(version, headers)
  }

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

        if (dictionary.value["$UUID"] instanceof Value.Bytes === false)
          throw new Error()

        const $UUID = StringAsUuid.from(dictionary.value["$UUID"].value.get())

        if (![KdfParameters.AesKdf.$UUID, KdfParameters.Argon2d.$UUID, KdfParameters.Argon2id.$UUID].includes($UUID))
          throw new Error()

        if ($UUID === KdfParameters.AesKdf.$UUID) {
          if (dictionary.value["R"] instanceof Value.UInt32 === false)
            throw new Error()
          const rounds = dictionary.value["R"].value

          if (dictionary.value["S"] instanceof Value.Bytes === false)
            throw new Error()
          const seed = dictionary.value["S"].value as Copiable<32>

          fields.kdf = new KdfParameters.AesKdf(rounds, seed)

          continue
        }

        if ($UUID === KdfParameters.Argon2d.$UUID) {
          if (dictionary.value["S"] instanceof Value.Bytes === false)
            throw new Error()
          const salt = dictionary.value["S"].value as Copiable<32>

          if (dictionary.value["P"] instanceof Value.UInt32 === false)
            throw new Error()
          const parallelism = dictionary.value["P"].value


          if (dictionary.value["M"] instanceof Value.UInt64 === false)
            throw new Error()
          const memory = dictionary.value["M"].value

          if (dictionary.value["I"] instanceof Value.UInt64 === false)
            throw new Error()
          const iterations = dictionary.value["I"].value

          if (dictionary.value["V"] instanceof Value.UInt32 === false)
            throw new Error()
          const version = dictionary.value["V"].value as KdfParameters.Argon2.Version

          fields.kdf = new KdfParameters.Argon2d(salt, parallelism, memory, iterations, version)

          continue
        }

        if ($UUID === KdfParameters.Argon2id.$UUID) {
          if (dictionary.value["S"] instanceof Value.Bytes === false)
            throw new Error()
          const salt = dictionary.value["S"].value as Copiable<32>

          if (dictionary.value["P"] instanceof Value.UInt32 === false)
            throw new Error()
          const parallelism = dictionary.value["P"].value

          if (dictionary.value["M"] instanceof Value.UInt64 === false)
            throw new Error()
          const memory = dictionary.value["M"].value

          if (dictionary.value["I"] instanceof Value.UInt64 === false)
            throw new Error()
          const iterations = dictionary.value["I"].value

          if (dictionary.value["V"] instanceof Value.UInt32 === false)
            throw new Error()
          const version = dictionary.value["V"].value as KdfParameters.Argon2.Version

          fields.kdf = new KdfParameters.Argon2id(salt, parallelism, memory, iterations, version)

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

export class Seed {

  constructor(
    readonly bytes: Copiable<32>
  ) { }

  static readOrThrow(cursor: Cursor) {
    return new Seed(cursor.readOrThrow(32))
  }

}

export type KdfParameters =
  | KdfParameters.AesKdf
  | KdfParameters.Argon2d
  | KdfParameters.Argon2id

export namespace KdfParameters {

  export class AesKdf {

    constructor(
      readonly rounds: number,
      readonly seed: Copiable<32>,
    ) { }

  }

  export namespace AesKdf {

    export const $UUID = "c9d9f39a-628a-4460-bf74-0d08c18a4fea"

  }

  export type Argon2 =
    | Argon2d
    | Argon2id

  export namespace Argon2 {

    export type Version = 0x10 | 0x13

  }

  export class Argon2d {

    constructor(
      readonly salt: Copiable<32>,
      readonly parallelism: number,
      readonly memory: bigint,
      readonly iterations: bigint,
      readonly version: Argon2.Version,
    ) { }

  }

  export namespace Argon2d {

    export const $UUID = "ef636ddf-8c29-444b-91f7-a9a403e30a0c"

  }

  export class Argon2id {

    constructor(
      readonly salt: Copiable<32>,
      readonly parallelism: number,
      readonly memory: bigint,
      readonly iterations: bigint,
      readonly version: Argon2.Version,
    ) { }

  }

  export namespace Argon2id {

    export const $UUID = "9e298b19-56db-4773-b23d-fc3ec6f0a1e6"

  }


}