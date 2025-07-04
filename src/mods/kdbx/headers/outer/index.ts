export * from "./cipher/index.js"
export * from "./compression/index.js"

import { Argon2 } from "@hazae41/argon2.wasm"
import { Opaque, Readable, Writable } from "@hazae41/binary"
import { Cursor } from "@hazae41/cursor"
import { Lengthed } from "@hazae41/lengthed"
import { Bytes } from "libs/bytes/index.js"
import { Mutable } from "libs/mutable/index.js"
import { TLV } from "libs/tlv/index.js"
import { StringAsUuid } from "libs/uuid/index.js"
import { Dictionary, Value } from "mods/kdbx/dictionary/index.js"
import { PreHmacKey } from "mods/kdbx/hmac/index.js"
import { CompositeKey, DerivedKey, MasterKeys, PreHmacMasterKey, PreMasterKey } from "mods/kdbx/index.js"
import { Vector } from "mods/kdbx/vector/index.js"
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
    readonly hash: Opaque<32>,
    readonly hmac: Opaque<32>
  ) { }

  static async computeOrThrow(data: MagicAndVersionAndHeadersWithBytes, keys: MasterKeys) {
    const index = 0xFFFFFFFFFFFFFFFFn
    const major = keys.authifier.bytes

    const key = await new PreHmacKey(index, major).digestOrThrow()

    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", data.bytes.bytes)) as Uint8Array & Lengthed<32>
    const hmac = new Uint8Array(await key.signOrThrow(data.bytes.bytes)) as Uint8Array & Lengthed<32>

    return new MagicAndVersionAndHeadersWithHashAndHmac(data, new Opaque(hash), new Opaque(hmac))
  }

  async verifyOrThrow(keys: MasterKeys) {
    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", this.data.bytes.bytes))

    if (!Bytes.equals(hash, this.hash.bytes))
      throw new Error()

    const index = 0xFFFFFFFFFFFFFFFFn
    const major = keys.authifier.bytes

    const key = await new PreHmacKey(index, major).digestOrThrow()

    await key.verifyOrThrow(this.data.bytes.bytes, this.hmac.bytes)
  }

  sizeOrThrow() {
    return this.data.sizeOrThrow() + 32 + 32
  }

  writeOrThrow(cursor: Cursor) {
    this.data.writeOrThrow(cursor)

    cursor.writeOrThrow(this.hash.bytes)
    cursor.writeOrThrow(this.hmac.bytes)
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
    const hash = new Opaque(cursor.readOrThrow(32))
    const hmac = new Opaque(cursor.readOrThrow(32))

    return new MagicAndVersionAndHeadersWithHashAndHmac(data, hash, hmac)
  }

}

export class MagicAndVersionAndHeadersWithBytes {

  constructor(
    readonly value: MagicAndVersionAndHeaders,
    readonly bytes: Opaque,
  ) { }

  static computeOrThrow(value: MagicAndVersionAndHeaders) {
    const bytes = new Opaque(Writable.writeToBytesOrThrow(value))
    return new MagicAndVersionAndHeadersWithBytes(value, bytes)
  }

  rotateOrThrow() {
    const value = this.value.rotateOrThrow()
    const bytes = new Opaque(Writable.writeToBytesOrThrow(value))

    return new MagicAndVersionAndHeadersWithBytes(value, bytes)
  }

  sizeOrThrow() {
    return this.bytes.bytes.length
  }

  writeOrThrow(cursor: Cursor) {
    cursor.writeOrThrow(this.bytes.bytes)
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
    const bytes = new Opaque(cursor.bytes.subarray(start, cursor.offset))

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

export interface HeadersInit {
  readonly cipher: Cipher
  readonly compression: Compression
  readonly seed: Opaque<32>
  readonly iv: Opaque
  readonly kdf: KdfParameters
  readonly custom?: Dictionary
}

export class Headers {

  constructor(
    readonly value: Vector<{ 2: readonly [Cipher], 3: readonly [Compression], 4: readonly [Opaque<32>], 7: readonly [Opaque], 11: readonly [KdfParameters], 12?: readonly [Dictionary] }>,
  ) { }

  get cipher() {
    return this.value.indexed[2][0]
  }

  get compression() {
    return this.value.indexed[3][0]
  }

  get seed() {
    return this.value.indexed[4][0]
  }

  get iv() {
    return this.value.indexed[7][0]
  }

  get kdf() {
    return this.value.indexed[11][0]
  }

  get custom() {
    return this.value.indexed[12]?.[0]
  }

  rotateOrThrow() {
    const { cipher, compression, kdf } = this

    const seed = crypto.getRandomValues(new Uint8Array(32)) as Uint8Array & Lengthed<32>
    const iv = crypto.getRandomValues(new Uint8Array(cipher.IV.length))

    return new Headers(cipher, compression, new Opaque(seed), new Opaque(iv), kdf.rotateOrThrow(), this.custom)
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
    const init: Partial<Mutable<HeadersInit>> = {}

    while (true) {
      const tlv = TLV.readOrThrow(cursor)

      if (tlv.type === 0)
        break

      if (tlv.type === 2) {
        init.cipher = tlv.readIntoOrThrow(Cipher)
        continue
      }

      if (tlv.type === 3) {
        init.compression = Readable.readFromBytesOrThrow(Compression, tlv.value.bytes)
        continue
      }

      if (tlv.type === 4) {
        init.seed = tlv.value as Opaque<32>
        continue
      }

      if (tlv.type === 7) {
        init.iv = tlv.value
        continue
      }

      if (tlv.type === 11) {
        init.kdf = Readable.readFromBytesOrThrow(KdfParameters, tlv.value.bytes)
        continue
      }

      if (tlv.type === 12) {
        init.custom = Readable.readFromBytesOrThrow(Dictionary, tlv.value.bytes)
        continue
      }

      throw new Error()
    }

    if (init.cipher == null)
      throw new Error()
    if (init.compression == null)
      throw new Error()
    if (init.seed == null)
      throw new Error()
    if (init.iv == null)
      throw new Error()
    if (init.kdf == null)
      throw new Error()

    const { cipher, compression, seed, iv, kdf, custom } = init
    return new Headers(cipher, compression, seed, iv, kdf, custom)
  }
}

export class Seed {

  constructor(
    readonly bytes: Opaque<32>
  ) { }

  static readOrThrow(cursor: Cursor) {
    return new Seed(new Opaque(cursor.readOrThrow(32)))
  }

}

export type KdfParameters =
  | KdfParameters.AesKdf
  | KdfParameters.Argon2d
  | KdfParameters.Argon2id

export namespace KdfParameters {

  export class AesKdf {

    constructor(
      readonly value: Dictionary<{ R: Value.UInt32, S: Value.Bytes }>
    ) { }

    get seed() {
      return this.value.keyvals["S"].value
    }

    get rounds() {
      return this.value.keyvals["R"].value
    }

    rotateOrThrow() {
      const { version } = this.value

      const R = this.value.keyvals["R"]
      const S = new Value.Bytes(new Opaque(crypto.getRandomValues(new Uint8Array(32)) as Uint8Array & Lengthed<32>))

      const value = Dictionary.initOrThrow(version, { R, S })

      return new AesKdf(value)
    }

    deriveOrThrow(key: CompositeKey): never {
      throw new Error()
    }

    sizeOrThrow() {
      return this.value.sizeOrThrow()
    }

    writeOrThrow(cursor: Cursor) {
      this.value.writeOrThrow(cursor)
    }

  }

  export namespace AesKdf {

    export const $UUID = "c9d9f39a-628a-4460-bf74-0d08c18a4fea"

    export function parseOrThrow(dictionary: Dictionary): AesKdf {
      const { version, entries } = dictionary

      if (dictionary.keyvals.R instanceof Value.UInt32 === false)
        throw new Error()
      const R = dictionary.keyvals.R

      if (dictionary.keyvals.S instanceof Value.Bytes === false)
        throw new Error()
      const S = dictionary.keyvals.S

      return new KdfParameters.AesKdf(new Dictionary(version, entries, { R, S }))
    }

  }

  export type Argon2 =
    | Argon2d
    | Argon2id

  export namespace Argon2 {

    export type Version = 0x10 | 0x13

  }

  export class Argon2d {

    constructor(
      readonly value: Dictionary<{ S: Value.Bytes<32>, P: Value.UInt32, M: Value.UInt64, I: Value.UInt64, V: Value.UInt32<Argon2.Version> }>,
    ) { }

    get salt() {
      return this.value.keyvals["S"].value
    }

    get parallelism() {
      return this.value.keyvals["P"].value
    }

    get memory() {
      return this.value.keyvals["M"].value
    }

    get iterations() {
      return this.value.keyvals["I"].value
    }

    get version() {
      return this.value.keyvals["V"].value
    }

    rotateOrThrow() {
      const { version } = this.value

      const S = new Value.Bytes(new Opaque(crypto.getRandomValues(new Uint8Array(32)) as Uint8Array & Lengthed<32>))
      const P = this.value.keyvals.P
      const M = this.value.keyvals.M
      const I = this.value.keyvals.I
      const V = this.value.keyvals.V

      const value = Dictionary.initOrThrow(version, { S, P, M, I, V })

      return new Argon2d(value)
    }

    deriveOrThrow(key: CompositeKey) {
      const { version, iterations, parallelism, memory, salt } = this

      const deriver = new Argon2.Argon2Deriver("argon2d", version, Number(memory) / 1024, Number(iterations), parallelism)
      const derived = deriver.derive(new Argon2.Memory(key.value.bytes), new Argon2.Memory(salt.bytes))

      return new DerivedKey(new Opaque(new Uint8Array(derived.bytes) as Uint8Array & Lengthed<32>))
    }

    sizeOrThrow() {
      return this.value.sizeOrThrow()
    }

    writeOrThrow(cursor: Cursor) {
      this.value.writeOrThrow(cursor)
    }

  }

  export namespace Argon2d {

    export const $UUID = "ef636ddf-8c29-444b-91f7-a9a403e30a0c"

    export function parseOrThrow(dictionary: Dictionary): Argon2d {
      const { version, entries } = dictionary

      if (dictionary.keyvals.S instanceof Value.Bytes === false)
        throw new Error()
      const S = dictionary.keyvals.S as Value.Bytes<32>

      if (dictionary.keyvals.P instanceof Value.UInt32 === false)
        throw new Error()
      const P = dictionary.keyvals.P

      if (dictionary.keyvals.M instanceof Value.UInt64 === false)
        throw new Error()
      const M = dictionary.keyvals.M

      if (dictionary.keyvals.I instanceof Value.UInt64 === false)
        throw new Error()
      const I = dictionary.keyvals.I

      if (dictionary.keyvals.V instanceof Value.UInt32 === false)
        throw new Error()
      const V = dictionary.keyvals.V as Value.UInt32<KdfParameters.Argon2.Version>

      return new KdfParameters.Argon2d(new Dictionary(version, entries, { S, P, M, I, V }))
    }

  }

  export class Argon2id {

    constructor(
      readonly value: Dictionary<{ S: Value.Bytes<32>, P: Value.UInt32, M: Value.UInt64, I: Value.UInt64, V: Value.UInt32<Argon2.Version> }>,
    ) { }

    get salt() {
      return this.value.keyvals["S"].value
    }

    get parallelism() {
      return this.value.keyvals["P"].value
    }

    get memory() {
      return this.value.keyvals["M"].value
    }

    get iterations() {
      return this.value.keyvals["I"].value
    }

    get version() {
      return this.value.keyvals["V"].value
    }

    rotateOrThrow() {
      const { version } = this.value

      const S = new Value.Bytes(new Opaque(crypto.getRandomValues(new Uint8Array(32)) as Uint8Array & Lengthed<32>))
      const P = this.value.keyvals.P
      const M = this.value.keyvals.M
      const I = this.value.keyvals.I
      const V = this.value.keyvals.V

      const value = Dictionary.initOrThrow(version, { S, P, M, I, V })

      return new Argon2d(value)
    }

    deriveOrThrow(key: CompositeKey) {
      const { version, iterations, parallelism, memory, salt } = this

      const deriver = new Argon2.Argon2Deriver("argon2id", version, Number(memory) / 1024, Number(iterations), parallelism)
      const derived = deriver.derive(new Argon2.Memory(key.value.bytes), new Argon2.Memory(salt.bytes))

      return new DerivedKey(new Opaque(new Uint8Array(derived.bytes) as Uint8Array & Lengthed<32>))
    }

    sizeOrThrow() {
      return this.value.sizeOrThrow()
    }

    writeOrThrow(cursor: Cursor) {
      this.value.writeOrThrow(cursor)
    }

  }

  export namespace Argon2id {

    export const $UUID = "9e298b19-56db-4773-b23d-fc3ec6f0a1e6"

    export function parseOrThrow(dictionary: Dictionary): Argon2id {
      const { version, entries } = dictionary

      if (dictionary.keyvals.S instanceof Value.Bytes === false)
        throw new Error()
      const S = dictionary.keyvals.S as Value.Bytes<32>

      if (dictionary.keyvals.P instanceof Value.UInt32 === false)
        throw new Error()
      const P = dictionary.keyvals.P

      if (dictionary.keyvals.M instanceof Value.UInt64 === false)
        throw new Error()
      const M = dictionary.keyvals.M

      if (dictionary.keyvals.I instanceof Value.UInt64 === false)
        throw new Error()
      const I = dictionary.keyvals.I

      if (dictionary.keyvals.V instanceof Value.UInt32 === false)
        throw new Error()
      const V = dictionary.keyvals.V as Value.UInt32<KdfParameters.Argon2.Version>

      return new KdfParameters.Argon2id(new Dictionary(version, entries, { S, P, M, I, V }))
    }

  }

  export function readOrThrow(cursor: Cursor): KdfParameters {
    const dictionary = Dictionary.readOrThrow(cursor)

    if (dictionary.keyvals["$UUID"] instanceof Value.Bytes === false)
      throw new Error()

    const $UUID = StringAsUuid.from(dictionary.keyvals["$UUID"].value.bytes)

    if (![KdfParameters.AesKdf.$UUID, KdfParameters.Argon2d.$UUID, KdfParameters.Argon2id.$UUID].includes($UUID))
      throw new Error()

    if ($UUID === KdfParameters.AesKdf.$UUID)
      return KdfParameters.AesKdf.parseOrThrow(dictionary)

    if ($UUID === KdfParameters.Argon2d.$UUID)
      return KdfParameters.Argon2d.parseOrThrow(dictionary)

    if ($UUID === KdfParameters.Argon2id.$UUID)
      return KdfParameters.Argon2id.parseOrThrow(dictionary)

    throw new Error()
  }


}