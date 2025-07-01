export * from "./cipher/index.js"
export * from "./compression/index.js"

import { Readable } from "@hazae41/binary"
import { Cursor } from "@hazae41/cursor"
import { Copiable } from "@hazae41/uncopy"
import { Bytes, Uint8Array } from "libs/bytes/index.js"
import { TLV } from "libs/tlv/index.js"
import { StringAsUuid } from "libs/uuid/index.js"
import { Dictionary, Value } from "mods/kdbx/dictionary/index.js"
import { Cipher } from "./cipher/index.js"
import { Compression } from "./compression/index.js"

export class HeadersWithHashAndHmac {

  constructor(
    readonly data: HeadersWithBytes,
    readonly hash: Copiable<32>,
    readonly hmac: Copiable<32>
  ) { }

  async verifyOrThrow(masterHmacKeyBytes: Uint8Array): Promise<true> {
    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", this.data.bytes.get()))

    if (!Bytes.equals(hash, this.hash.get()))
      throw new Error()

    const preHmacKeyBytes = new Uint8Array(8 + masterHmacKeyBytes.length)
    const preHmacKeyCursor = new Cursor(preHmacKeyBytes)
    preHmacKeyCursor.writeUint64OrThrow(0xFFFFFFFFFFFFFFFFn, true)
    preHmacKeyCursor.writeOrThrow(masterHmacKeyBytes)

    const hmacKeyBytes = new Uint8Array(await crypto.subtle.digest("SHA-512", preHmacKeyBytes))
    const hmacKey = await crypto.subtle.importKey("raw", hmacKeyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"])

    const preHmacSigBytes = new Uint8Array(8 + 4 + this.data.bytes.get().length)
    const preHmacSigCursor = new Cursor(preHmacSigBytes)
    preHmacSigCursor.writeUint64OrThrow(0xFFFFFFFFFFFFFFFFn, true)
    preHmacSigCursor.writeUint32OrThrow(this.data.bytes.get().length, true)
    preHmacSigCursor.writeOrThrow(this.data.bytes.get())

    const hmacSigBytes = new Uint8Array(await crypto.subtle.sign("HMAC", hmacKey, preHmacSigBytes))


    console.log(hmacSigBytes, this.hmac.get())

    if (!Bytes.equals(hmacSigBytes, this.hmac.get()))
      throw new Error()

    return true
  }

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