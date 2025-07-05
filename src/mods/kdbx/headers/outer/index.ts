export * from "./cipher/index.js"
export * from "./compression/index.js"

import { Argon2 } from "@hazae41/argon2.wasm"
import { Opaque, Readable, Writable } from "@hazae41/binary"
import { Cursor } from "@hazae41/cursor"
import { Lengthed } from "@hazae41/lengthed"
import { Bytes } from "libs/bytes/index.js"
import { StringAsUuid } from "libs/uuid/index.js"
import { Dictionary, Entries, Value } from "mods/kdbx/dictionary/index.js"
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
    cursor.writeUint16OrThrow(this.minor, true)
    cursor.writeUint16OrThrow(this.major, true)
  }

  cloneOrThrow() {
    return this
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

  cloneOrThrow() {
    const data = this.data.cloneOrThrow()
    const hash = this.hash.cloneOrThrow()
    const hmac = this.hmac.cloneOrThrow()

    return new MagicAndVersionAndHeadersWithHashAndHmac(data, hash, hmac)
  }

  async deriveOrThrow(composite: CompositeKey) {
    return await this.data.deriveOrThrow(composite)
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

  cloneOrThrow() {
    const value = this.value.cloneOrThrow()
    const bytes = this.bytes.cloneOrThrow()

    return new MagicAndVersionAndHeadersWithBytes(value, bytes)
  }

  async deriveOrThrow(composite: CompositeKey) {
    return await this.value.deriveOrThrow(composite)
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

  cloneOrThrow() {
    const version = this.version.cloneOrThrow()
    const headers = this.headers.cloneOrThrow()

    return new MagicAndVersionAndHeaders(version, headers)
  }

  async deriveOrThrow(composite: CompositeKey) {
    return await this.headers.deriveOrThrow(composite)
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
    return this.value.value[2][0]
  }

  get compression() {
    return this.value.value[3][0]
  }

  get seed() {
    return this.value.value[4][0]
  }

  get iv() {
    return this.value.value[7][0]
  }

  get kdf() {
    return this.value.value[11][0]
  }

  get custom() {
    return this.value.value[12]?.[0]
  }

  rotateOrThrow() {
    const { cipher, compression, custom } = this

    const seed = new Opaque(crypto.getRandomValues(new Uint8Array(32)) as Uint8Array & Lengthed<32>)
    const iv = new Opaque(crypto.getRandomValues(new Uint8Array(cipher.IV.length)))
    const kdf = this.kdf.rotateOrThrow()

    return Headers.initOrThrow({ cipher, compression, seed, iv, kdf, custom })
  }

  sizeOrThrow(): number {
    return this.value.sizeOrThrow()
  }

  writeOrThrow(cursor: Cursor): void {
    this.value.writeOrThrow(cursor)
  }

  cloneOrThrow() {
    return Readable.readFromBytesOrThrow(Headers, Writable.writeToBytesOrThrow(this))
  }

  async deriveOrThrow(composite: CompositeKey) {
    const { seed } = this

    const derived = this.kdf.deriveOrThrow(composite)

    const encrypter = await new PreMasterKey(seed, derived).digestOrThrow()
    const authifier = await new PreHmacMasterKey(seed, derived).digestOrThrow()

    return new MasterKeys(encrypter, authifier)
  }

}

export namespace Headers {

  export function initOrThrow(init: HeadersInit) {
    const { cipher, compression, seed, iv, kdf, custom } = init

    if (iv.bytes.length !== cipher.IV.length)
      throw new Error()

    const a = [cipher] as const
    const b = [compression] as const
    const c = [new Opaque(seed.bytes)] as const
    const d = [new Opaque(iv.bytes)] as const
    const e = [kdf] as const
    const f = custom != null ? [custom] as const : undefined

    const vector = Vector.initOrThrow({ 2: a, 3: b, 4: c, 7: d, 11: e, 12: f })

    return new Headers(vector)
  }

  export function readOrThrow(cursor: Cursor) {
    const vector = Vector.readOrThrow(cursor)

    if (vector.value[2].length !== 1)
      throw new Error()
    const a = [vector.value[2][0].readIntoOrThrow(Cipher)] as const

    if (vector.value[3].length !== 1)
      throw new Error()
    const b = [vector.value[3][0].readIntoOrThrow(Compression)] as const

    if (vector.value[4].length !== 1)
      throw new Error()
    if (vector.value[4][0].bytes.length !== 32)
      throw new Error()
    const c = [vector.value[4][0] as Opaque<32>] as const

    if (vector.value[7].length !== 1)
      throw new Error()
    const d = [vector.value[7][0]] as const

    if (vector.value[11].length !== 1)
      throw new Error()
    const e = [vector.value[11][0].readIntoOrThrow(KdfParameters)] as const

    if (vector.value[12] != null && vector.value[12].length !== 1)
      throw new Error()
    const f = vector.value[12] != null ? [vector.value[12][0].readIntoOrThrow(Dictionary)] as const : undefined

    const indexed = { 2: a, 3: b, 4: c, 7: d, 11: e, 12: f } as const

    return new Headers(new Vector(vector.bytes, indexed))
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
      readonly value: Dictionary<{ $UUID: Value.Bytes, R: Value.UInt32, S: Value.Bytes }>
    ) { }

    get seed() {
      return this.value.entries.value["S"].value
    }

    get rounds() {
      return this.value.entries.value["R"].value
    }

    rotateOrThrow() {
      const { version } = this.value

      const $UUID = this.value.entries.value["$UUID"]

      const R = this.value.entries.value["R"]
      const S = new Value.Bytes(new Opaque(crypto.getRandomValues(new Uint8Array(32)) as Uint8Array & Lengthed<32>))

      const value = Dictionary.initOrThrow(version, { $UUID, R, S })

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

    cloneOrThrow() {
      return new AesKdf(this.value.cloneOrThrow())
    }

  }

  export namespace AesKdf {

    export const $UUID = "c9d9f39a-628a-4460-bf74-0d08c18a4fea"

    export function parseOrThrow(dictionary: Dictionary): AesKdf {
      const { version, entries } = dictionary

      if (entries.value["$UUID"] instanceof Value.Bytes === false)
        throw new Error()
      const $UUID = entries.value["$UUID"]

      if (entries.value.R instanceof Value.UInt32 === false)
        throw new Error()
      const R = entries.value.R

      if (entries.value.S instanceof Value.Bytes === false)
        throw new Error()
      const S = entries.value.S

      return new KdfParameters.AesKdf(new Dictionary(version, new Entries(entries.bytes, { $UUID, R, S })))
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
      readonly value: Dictionary<{ $UUID: Value.Bytes, S: Value.Bytes<32>, P: Value.UInt32, M: Value.UInt64, I: Value.UInt64, V: Value.UInt32<Argon2.Version> }>,
    ) { }

    get salt() {
      return this.value.entries.value["S"].value
    }

    get parallelism() {
      return this.value.entries.value["P"].value
    }

    get memory() {
      return this.value.entries.value["M"].value
    }

    get iterations() {
      return this.value.entries.value["I"].value
    }

    get version() {
      return this.value.entries.value["V"].value
    }

    rotateOrThrow() {
      const { version } = this.value

      const $UUID = this.value.entries.value["$UUID"]

      const S = new Value.Bytes(new Opaque(crypto.getRandomValues(new Uint8Array(32)) as Uint8Array & Lengthed<32>))
      const P = this.value.entries.value.P
      const M = this.value.entries.value.M
      const I = this.value.entries.value.I
      const V = this.value.entries.value.V

      const value = Dictionary.initOrThrow(version, { $UUID, S, P, M, I, V })

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

    cloneOrThrow() {
      return new Argon2d(this.value.cloneOrThrow())
    }

  }

  export namespace Argon2d {

    export const $UUID = "ef636ddf-8c29-444b-91f7-a9a403e30a0c"

    export function parseOrThrow(dictionary: Dictionary): Argon2d {
      const { version, entries } = dictionary

      if (dictionary.entries.value["$UUID"] instanceof Value.Bytes === false)
        throw new Error()
      const $UUID = dictionary.entries.value["$UUID"]

      if (dictionary.entries.value.S instanceof Value.Bytes === false)
        throw new Error()
      const S = dictionary.entries.value.S as Value.Bytes<32>

      if (dictionary.entries.value.P instanceof Value.UInt32 === false)
        throw new Error()
      const P = dictionary.entries.value.P

      if (dictionary.entries.value.M instanceof Value.UInt64 === false)
        throw new Error()
      const M = dictionary.entries.value.M

      if (dictionary.entries.value.I instanceof Value.UInt64 === false)
        throw new Error()
      const I = dictionary.entries.value.I

      if (dictionary.entries.value.V instanceof Value.UInt32 === false)
        throw new Error()
      const V = dictionary.entries.value.V as Value.UInt32<KdfParameters.Argon2.Version>

      return new KdfParameters.Argon2d(new Dictionary(version, new Entries(entries.bytes, { $UUID, S, P, M, I, V })))
    }

  }

  export class Argon2id {

    constructor(
      readonly value: Dictionary<{ $UUID: Value.Bytes, S: Value.Bytes<32>, P: Value.UInt32, M: Value.UInt64, I: Value.UInt64, V: Value.UInt32<Argon2.Version> }>,
    ) { }

    get salt() {
      return this.value.entries.value["S"].value
    }

    get parallelism() {
      return this.value.entries.value["P"].value
    }

    get memory() {
      return this.value.entries.value["M"].value
    }

    get iterations() {
      return this.value.entries.value["I"].value
    }

    get version() {
      return this.value.entries.value["V"].value
    }

    rotateOrThrow() {
      const { version } = this.value

      const $UUID = this.value.entries.value["$UUID"]

      const S = new Value.Bytes(new Opaque(crypto.getRandomValues(new Uint8Array(32)) as Uint8Array & Lengthed<32>))
      const P = this.value.entries.value.P
      const M = this.value.entries.value.M
      const I = this.value.entries.value.I
      const V = this.value.entries.value.V

      const value = Dictionary.initOrThrow(version, { $UUID, S, P, M, I, V })

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

    cloneOrThrow() {
      return new Argon2id(this.value.cloneOrThrow())
    }

  }

  export namespace Argon2id {

    export const $UUID = "9e298b19-56db-4773-b23d-fc3ec6f0a1e6"

    export function parseOrThrow(dictionary: Dictionary): Argon2id {
      const { version, entries } = dictionary

      if (entries.value["$UUID"] instanceof Value.Bytes === false)
        throw new Error()
      const $UUID = entries.value["$UUID"]

      if (entries.value.S instanceof Value.Bytes === false)
        throw new Error()
      const S = entries.value.S as Value.Bytes<32>

      if (entries.value.P instanceof Value.UInt32 === false)
        throw new Error()
      const P = entries.value.P

      if (entries.value.M instanceof Value.UInt64 === false)
        throw new Error()
      const M = entries.value.M

      if (entries.value.I instanceof Value.UInt64 === false)
        throw new Error()
      const I = entries.value.I

      if (entries.value.V instanceof Value.UInt32 === false)
        throw new Error()
      const V = entries.value.V as Value.UInt32<KdfParameters.Argon2.Version>

      return new KdfParameters.Argon2id(new Dictionary(version, new Entries(entries.bytes, { $UUID, S, P, M, I, V })))
    }

  }

  export function readOrThrow(cursor: Cursor): KdfParameters {
    const dictionary = Dictionary.readOrThrow(cursor)

    if (dictionary.entries.value["$UUID"] instanceof Value.Bytes === false)
      throw new Error()

    const $UUID = StringAsUuid.from(dictionary.entries.value["$UUID"].value.bytes)

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