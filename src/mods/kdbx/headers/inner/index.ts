import { Opaque, Readable } from "@hazae41/binary"
import { Cursor } from "@hazae41/cursor"
import { TLV } from "libs/tlv/index.js"

export class HeadersAndContent {

  constructor(
    readonly headers: Headers,
    readonly content: Document
  ) { }

}

export namespace HeadersAndContent {

  export function readOrThrow(cursor: Cursor) {
    const headers = Headers.readOrThrow(cursor)
    const content = cursor.readOrThrow(cursor.remaining)

    const raw = new TextDecoder().decode(content)
    const xml = new DOMParser().parseFromString(raw, "text/xml")

    return new HeadersAndContent(headers, xml)
  }

}

export class Headers {

  constructor(
    readonly cipher: StreamCipher,
    readonly key: Opaque,
    readonly binary: Opaque[]
  ) { }

}

export namespace Headers {

  export function readOrThrow(cursor: Cursor) {
    const fields: {
      cipher?: StreamCipher,
      key?: Opaque,
      binary: Opaque[]
    } = {
      binary: []
    }

    while (true) {
      const tlv = TLV.readOrThrow(cursor)

      if (tlv.type === 0)
        break

      if (tlv.type === 1) {
        fields.cipher = Readable.readFromBytesOrThrow(StreamCipher, tlv.value.bytes)
        continue
      }

      if (tlv.type === 2) {
        fields.key = tlv.value
        continue
      }

      if (tlv.type === 3) {
        fields.binary.push(tlv.value)
        continue
      }

      throw new Error()
    }

    if (fields.cipher == null)
      throw new Error()
    if (fields.key == null)
      throw new Error()

    const { cipher, key, binary } = fields
    return new Headers(cipher, key, binary)
  }

}

export type StreamCipher =
  | typeof StreamCipher.ArcFourVariant
  | typeof StreamCipher.Salsa20
  | typeof StreamCipher.ChaCha20

export namespace StreamCipher {

  export namespace ArcFourVariant {

    export const type = 0x01

    export function writeOrThrow(cursor: Cursor) {
      cursor.writeUint32OrThrow(type, true)
    }

  }

  export namespace Salsa20 {

    export const type = 0x02

    export function writeOrThrow(cursor: Cursor) {
      cursor.writeUint32OrThrow(type, true)
    }

  }

  export namespace ChaCha20 {

    export const type = 0x03

    export function writeOrThrow(cursor: Cursor) {
      cursor.writeUint32OrThrow(type, true)
    }

  }

}

export namespace StreamCipher {

  export function readOrThrow(cursor: Cursor) {
    const value = cursor.readUint32OrThrow(true)

    if (value === StreamCipher.ArcFourVariant.type)
      return StreamCipher.ArcFourVariant
    if (value === StreamCipher.Salsa20.type)
      return StreamCipher.Salsa20
    if (value === StreamCipher.ChaCha20.type)
      return StreamCipher.ChaCha20

    throw new Error()
  }

}