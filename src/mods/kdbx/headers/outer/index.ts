export * from "./cipher/index.js"
export * from "./compression/index.js"

import { Argon2 } from "@hazae41/argon2.wasm"
import { Readable, Writable } from "@hazae41/binary"
import { Cursor } from "@hazae41/cursor"
import { Copiable, Copied, Uncopied } from "@hazae41/uncopy"
import { Bytes, Uint8Array } from "libs/bytes/index.js"
import { TLV } from "libs/tlv/index.js"
import { StringAsUuid } from "libs/uuid/index.js"
import { Dictionary, Value } from "mods/kdbx/dictionary/index.js"
import { PreHmacKey } from "mods/kdbx/hmac/index.js"
import { CompositeKey, DerivedKey, MasterKeys, PreHmacMasterKey, PreMasterKey } from "mods/kdbx/index.js"
import { Cipher } from "./cipher/index.js"
import { Compression } from "./compression/index.js"

export class Version {

  constructor(
    readonly major: number,
    readonly minor: number,
  ) { }

  sizeOrThrow() {
    return 2 + 2
  }

  writeOrThrow(cursor: Cursor) {
    cursor.writeUint16OrThrow(this.major, true)
    cursor.writeUint16OrThrow(this.minor, true)
  }

}


export class MagicAndVersionAndHeadersWithHashAndHmac {

  constructor(
    readonly data: MagicAndVersionAndHeadersWithBytes,
    readonly hash: Copiable<32>,
    readonly hmac: Copiable<32>
  ) { }

  static async computeOrThrow(data: MagicAndVersionAndHeadersWithBytes, keys: MasterKeys) {
    const index = 0xFFFFFFFFFFFFFFFFn
    const major = keys.authifier.bytes

    const key = await new PreHmacKey(index, major).digestOrThrow()

    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", data.bytes.get())) as Uint8Array<32>
    const hmac = new Uint8Array(await key.signOrThrow(data.bytes.get())) as Uint8Array<32>

    return new MagicAndVersionAndHeadersWithHashAndHmac(data, new Copied(hash), new Copied(hmac))
  }

  async verifyOrThrow(keys: MasterKeys) {
    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", this.data.bytes.get()))

    if (!Bytes.equals(hash, this.hash.get()))
      throw new Error()

    const index = 0xFFFFFFFFFFFFFFFFn
    const major = keys.authifier.bytes

    const key = await new PreHmacKey(index, major).digestOrThrow()

    await key.verifyOrThrow(this.data.bytes.get(), this.hmac.get())
  }

  sizeOrThrow() {
    return this.data.sizeOrThrow() + 32 + 32
  }

  writeOrThrow(cursor: Cursor) {
    this.data.writeOrThrow(cursor)

    cursor.writeOrThrow(this.hash.get())
    cursor.writeOrThrow(this.hmac.get())
  }

  deriveOrThrow(composite: CompositeKey) {
    return this.data.deriveOrThrow(composite)
  }

  async digestOrThrow(derived: DerivedKey) {
    return await this.data.digestOrThrow(derived)
  }

}

export namespace MagicAndVersionAndHeadersWithHashAndHmac {

  export function readOrThrow(cursor: Cursor) {
    const data = MagicAndVersionAndHeadersWithBytes.readOrThrow(cursor)
    const hash = cursor.readOrThrow(32)
    const hmac = cursor.readOrThrow(32)

    return new MagicAndVersionAndHeadersWithHashAndHmac(data, hash, hmac)
  }

}

export class MagicAndVersionAndHeadersWithBytes {

  constructor(
    readonly value: MagicAndVersionAndHeaders,
    readonly bytes: Copiable,
  ) { }

  static computeOrThrow(value: MagicAndVersionAndHeaders) {
    const bytes = new Copied(Writable.writeToBytesOrThrow(value))
    return new MagicAndVersionAndHeadersWithBytes(value, bytes)
  }

  rotateOrThrow() {
    const value = this.value.rotateOrThrow()
    const bytes = new Copied(Writable.writeToBytesOrThrow(value))

    return new MagicAndVersionAndHeadersWithBytes(value, bytes)
  }

  sizeOrThrow() {
    return this.bytes.get().length
  }

  writeOrThrow(cursor: Cursor) {
    cursor.writeOrThrow(this.bytes.get())
  }

  deriveOrThrow(composite: CompositeKey) {
    return this.value.deriveOrThrow(composite)
  }

  async digestOrThrow(derived: DerivedKey) {
    return await this.value.digestOrThrow(derived)
  }

}

export namespace MagicAndVersionAndHeadersWithBytes {

  export function readOrThrow(cursor: Cursor) {
    const start = cursor.offset

    const value = MagicAndVersionAndHeaders.readOrThrow(cursor)
    const bytes = new Uncopied(cursor.bytes.subarray(start, cursor.offset))

    return new MagicAndVersionAndHeadersWithBytes(value, bytes)
  }

}

export class MagicAndVersionAndHeaders {

  constructor(
    readonly version: Version,
    readonly headers: Headers
  ) { }

  rotateOrThrow() {
    const { version } = this

    const headers = this.headers.rotateOrThrow()

    return new MagicAndVersionAndHeaders(version, headers)
  }

  sizeOrThrow() {
    return 4 + 4 + this.version.sizeOrThrow() + this.headers.sizeOrThrow()
  }

  writeOrThrow(cursor: Cursor) {
    cursor.writeUint32OrThrow(0x9AA2D903, true)
    cursor.writeUint32OrThrow(0xB54BFB67, true)

    this.version.writeOrThrow(cursor)
    this.headers.writeOrThrow(cursor)
  }

  deriveOrThrow(composite: CompositeKey) {
    return this.headers.deriveOrThrow(composite)
  }

  async digestOrThrow(derived: DerivedKey) {
    return await this.headers.digestOrThrow(derived)
  }

}

export namespace MagicAndVersionAndHeaders {

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

    return new MagicAndVersionAndHeaders(version, headers)
  }

}

export class Headers {

  constructor(
    readonly cipher: Cipher,
    readonly compression: Compression,
    readonly seed: Copiable<32>,
    readonly iv: Copiable,
    readonly kdf: KdfParameters,
    readonly custom?: Dictionary
  ) { }

  rotateOrThrow() {
    const { cipher, compression, iv, kdf } = this

    const seed = crypto.getRandomValues(new Uint8Array(32)) as Uint8Array<32>

    return new Headers(cipher, compression, new Copied(seed), iv, kdf, this.custom)
  }

  sizeOrThrow(): number {
    throw new Error("Not implemented")
  }

  writeOrThrow(cursor: Cursor): void {
    throw new Error("Not implemented")
  }

  deriveOrThrow(composite: CompositeKey) {
    return this.kdf.deriveOrThrow(composite)
  }

  async digestOrThrow(derived: DerivedKey) {
    const { seed } = this

    const encrypter = await new PreMasterKey(seed, derived).digestOrThrow()
    const authifier = await new PreHmacMasterKey(seed, derived).digestOrThrow()

    return new MasterKeys(encrypter, authifier)
  }

}

export namespace Headers {

  export function readOrThrow(cursor: Cursor) {
    const fields: {
      cipher?: Cipher,
      compression?: Compression
      seed?: Copiable<32>
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
        fields.seed = tlv.bytes as Copiable<32>
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

    deriveOrThrow(key: CompositeKey): never {
      throw new Error()
    }

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

    deriveOrThrow(key: CompositeKey) {
      const { version, iterations, parallelism, memory, salt } = this

      const deriver = new Argon2.Argon2Deriver("argon2d", version, Number(memory) / 1024, Number(iterations), parallelism)
      const derived = deriver.derive(new Argon2.Memory(key.bytes.get()), new Argon2.Memory(salt.get()))

      return new DerivedKey(new Copied(new Uint8Array(derived.bytes) as Uint8Array<32>))
    }

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

    deriveOrThrow(key: CompositeKey) {
      const { version, iterations, parallelism, memory, salt } = this

      const deriver = new Argon2.Argon2Deriver("argon2id", version, Number(memory) / 1024, Number(iterations), parallelism)
      const derived = deriver.derive(new Argon2.Memory(key.bytes.get()), new Argon2.Memory(salt.get()))

      return new DerivedKey(new Copied(new Uint8Array(derived.bytes) as Uint8Array<32>))
    }

  }

  export namespace Argon2id {

    export const $UUID = "9e298b19-56db-4773-b23d-fc3ec6f0a1e6"

  }


}