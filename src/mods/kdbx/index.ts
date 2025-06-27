import { Readable } from "@hazae41/binary";
import { Cursor } from "@hazae41/cursor";
import { Copiable, Uncopied } from "libs/copy/index.js";

export { };

export class Database {

  constructor(
    readonly head: Head,
    readonly body: Block[]
  ) { }

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

export class Block {

  constructor(
    readonly hmac: Copiable<32>,
    readonly data: Copiable
  ) { }

}

export namespace Block {

  export function readOrThrow(cursor: Cursor) {
    const hmac = new Uncopied(cursor.readOrThrow(32))
    const size = cursor.readUint32OrThrow(true)
    const data = new Uncopied(cursor.readOrThrow(size))

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
    const hash = new Uncopied(cursor.readOrThrow(32))
    const hmac = new Uncopied(cursor.readOrThrow(32))

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

export class Cipher {

  constructor(
    readonly uuid: string
  ) { }

}

export namespace Cipher {

  export const Aes128Cbc = new Cipher("61ab05a1-9464-41c3-8d74-3a563df8dd35")

  export const Aes256Cbc = new Cipher("31c1f2e6-bf71-4350-be58-05216afc5aff")

  export const TwoFishCbc = new Cipher("ad68f29f-576f-4bb9-a36a-d47af965346c")

  export const ChaCha20 = new Cipher("d6038a2b-8b6f-4cb5-a524-339a31dbb59a")

}

export namespace Cipher {

  export function readOrThrow(cursor: Cursor) {
    const bytes = cursor.readOrThrow(16)
    const uuid = StringAsUuid.from(bytes)

    if (uuid === Aes256Cbc.uuid)
      return Aes256Cbc
    if (uuid === ChaCha20.uuid)
      return ChaCha20

    throw new Error()
  }

}

export class Compression {

  constructor(
    readonly type: number
  ) { }

}

export namespace Compression {

  export const None = new Compression(0x00)
  export const Gzip = new Compression(0x01)

  export function readOrThrow(cursor: Cursor) {
    const value = cursor.readUint32OrThrow(true)

    if (value === None.type)
      return None
    if (value === Gzip.type)
      return Gzip

    throw new Error()
  }

}

export class TLV {

  constructor(
    readonly type: number,
    readonly bytes: Copiable
  ) { }

  static readOrThrow(cursor: Cursor) {
    const type = cursor.readUint8OrThrow()
    const length = cursor.readUint32OrThrow(true)
    const bytes = new Uncopied(cursor.readOrThrow(length))

    return new TLV(type, bytes)
  }

}

export class Seed {

  constructor(
    readonly bytes: Copiable<32>
  ) { }

  static readOrThrow(cursor: Cursor) {
    return new Seed(new Uncopied(cursor.readOrThrow(32)))
  }

}

export class Dictionary {

  constructor(
    readonly value: { [key: string]: X }
  ) { }

}

export namespace Dictionary {

  export function readOrThrow(cursor: Cursor) {
    const minor = cursor.readUint8OrThrow()
    const major = cursor.readUint8OrThrow()

    if (major !== 1)
      throw new Error()

    const dictionary: { [key: string]: X } = {}

    while (true) {
      const type = cursor.readUint8OrThrow()

      if (type === 0)
        break

      const klength = cursor.readUint32OrThrow(true)
      const kstring = cursor.readUtf8OrThrow(klength)

      const vlength = cursor.readUint32OrThrow(true)
      const vbytes = new Uncopied(cursor.readOrThrow(vlength))

      if (type === UInt32.type) {
        dictionary[kstring] = Readable.readFromBytesOrThrow(UInt32, vbytes.get())
        continue
      }

      if (type === UInt64.type) {
        dictionary[kstring] = Readable.readFromBytesOrThrow(UInt64, vbytes.get())
        continue
      }

      if (type === Boolean.type) {
        dictionary[kstring] = Readable.readFromBytesOrThrow(Boolean, vbytes.get())
        continue
      }

      if (type === Int32.type) {
        dictionary[kstring] = Readable.readFromBytesOrThrow(Int32, vbytes.get())
        continue
      }

      if (type === Int64.type) {
        dictionary[kstring] = Readable.readFromBytesOrThrow(Int64, vbytes.get())
        continue
      }

      if (type === String.type) {
        dictionary[kstring] = Readable.readFromBytesOrThrow(String, vbytes.get())
        continue
      }

      if (type === Bytes.type) {
        dictionary[kstring] = Readable.readFromBytesOrThrow(Bytes, vbytes.get())
        continue
      }

      throw new Error()
    }

    return new Dictionary(dictionary)
  }

}

export type X =
  | UInt32
  | UInt64
  | Boolean
  | Int32
  | Int64
  | String
  | Bytes

export class UInt32 {

  constructor(
    readonly value: number
  ) { }

}

export namespace UInt32 {

  export const type = 0x04

  export function readOrThrow(cursor: Cursor) {
    return new UInt32(cursor.readUint32OrThrow(true))
  }

}

export class UInt64 {

  constructor(
    readonly value: bigint
  ) { }

}

export namespace UInt64 {

  export const type = 0x05

  export function readOrThrow(cursor: Cursor) {
    return new UInt64(cursor.readUint64OrThrow(true))
  }

}

export class Boolean {

  constructor(
    readonly value: boolean
  ) { }

}

export namespace Boolean {

  export const type = 0x08

  export function readOrThrow(cursor: Cursor) {
    const value = cursor.readUint8OrThrow()

    if (value !== 0 && value !== 1)
      throw new Error()

    return new Boolean(value === 1)
  }

}

export class Int32 {

  constructor(
    readonly value: number
  ) { }

}

export namespace Int32 {

  export const type = 0x0C

  export function readOrThrow(cursor: Cursor) {
    const uint = cursor.readUint32OrThrow(true)

    const int = uint > ((2 ** 31) - 1) ? uint - (2 ** 32) : uint

    return new Int32(int)
  }

}

export class Int64 {

  constructor(
    readonly value: bigint
  ) { }

}

export namespace Int64 {

  export const type = 0x0D

  export function readOrThrow(cursor: Cursor) {
    const uint = cursor.readUint64OrThrow(true)

    const int = uint > ((2n ** 63n) - 1n) ? uint - (2n ** 64n) : uint

    return new Int64(int)
  }

}

export class String {

  constructor(
    readonly value: string
  ) { }

}

export namespace String {

  export const type = 0x18

  export function readOrThrow(cursor: Cursor) {
    return new String(cursor.readUtf8OrThrow(cursor.remaining))
  }

}

export class Bytes {

  constructor(
    readonly value: Copiable
  ) { }

}

export namespace Bytes {

  export const type = 0x42

  export function readOrThrow(cursor: Cursor) {
    return new Bytes(new Uncopied(cursor.readOrThrow(cursor.remaining)))
  }

}

export namespace StringAsUuid {

  export function from(bytes: Uint8Array) {
    const base16 = Buffer.from(bytes).toString("hex") // todo use wasm

    const a = base16.slice(0, 8)
    const b = base16.slice(8, 12)
    const c = base16.slice(12, 16)
    const d = base16.slice(16, 20)
    const e = base16.slice(20, 32)

    return [a, b, c, d, e].join("-")
  }

}

export namespace BytesAsUuid {

  export function from(string: string) {
    const a = string.slice(0, 8)
    const b = string.slice(8, 12)
    const c = string.slice(12, 16)
    const d = string.slice(16, 20)
    const e = string.slice(20, 32)

    const base16 = [a, b, c, d, e].join("")

    return Buffer.from(base16, "hex")
  }

}