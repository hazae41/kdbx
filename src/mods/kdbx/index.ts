import { Readable } from "@hazae41/binary";
import { Cursor } from "@hazae41/cursor";
import { Copiable, Uncopied } from "libs/copy/index.js";

export { };

export class Database {

  constructor() { }

}

export namespace Database {

  export function readOrThrow(cursor: Cursor) {
    const alpha = cursor.readUint32OrThrow(true)

    if (alpha !== 0x9AA2D903)
      throw new Error()

    const beta = cursor.readUint32OrThrow(true)

    if (beta !== 0xB54BFB67)
      throw new Error()

    const minor = cursor.readUint16OrThrow(true)
    const major = cursor.readUint16OrThrow(true)

    if (major !== 4)
      throw new Error()

    const headers: {
      cipher?: Cipher,
      compression?: Compression
      seed?: Copiable
      iv?: Copiable
      custom?: Copiable
    } = {}

    while (true) {
      const tlv = TLV.readOrThrow(cursor)

      if (tlv.type === 0)
        break

      if (tlv.type === 2) {
        headers.cipher = Readable.readFromBytesOrThrow(Cipher, tlv.bytes.get())
        continue
      }

      if (tlv.type === 3) {
        headers.compression = Readable.readFromBytesOrThrow(Compression, tlv.bytes.get())
        continue
      }

      if (tlv.type === 4) {
        headers.seed = tlv.bytes
        continue
      }

      if (tlv.type === 5) {
        headers.iv = tlv.bytes
        continue
      }

      if (tlv.type === 8) {
        headers.custom = tlv.bytes
        continue
      }

      if (tlv.type === 11) {
        Readable.readFromBytesOrThrow(Dictionary, tlv.bytes.get())
        continue
      }

      console.log(tlv)
    }

    // console.log(Buffer.from(cursor.after.slice(0, 32)).toString("hex"))

    return
  }

}

export class Cipher {

  constructor(
    readonly uuid: string
  ) { }

}

export namespace Cipher {

  export const Aes256 = new Cipher("31c1f2e6-bf71-4350-be58-05216afc5aff")
  export const ChaCha20 = new Cipher("d6038a2b-8b6f-4cb5-a524-339a31dbb59a")

  export function readOrThrow(cursor: Cursor) {
    const bytes = cursor.readOrThrow(16)
    const base16 = Buffer.from(bytes).toString("hex") // todo use wasm

    const a = base16.slice(0, 8)
    const b = base16.slice(8, 12)
    const c = base16.slice(12, 16)
    const d = base16.slice(16, 20)
    const e = base16.slice(20, 32)

    const uuid = [a, b, c, d, e].join("-")

    if (uuid === Aes256.uuid)
      return Aes256
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

  constructor() { }

}

export namespace Dictionary {

  export function readOrThrow(cursor: Cursor) {
    const minor = cursor.readUint8OrThrow()
    const major = cursor.readUint8OrThrow()

    if (major !== 1)
      throw new Error()

    console.log(cursor.after)

    cursor.readOrThrow(cursor.remaining)
  }

}