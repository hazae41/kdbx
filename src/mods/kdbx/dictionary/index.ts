import { Readable } from "@hazae41/binary"
import { Cursor } from "@hazae41/cursor"
import { Copiable } from "@hazae41/uncopy"

export class Dictionary {

  constructor(
    readonly value: { [key: string]: Value }
  ) { }

}

export namespace Dictionary {

  export function readOrThrow(cursor: Cursor) {
    const minor = cursor.readUint8OrThrow()
    const major = cursor.readUint8OrThrow()

    if (major !== 1)
      throw new Error()

    const dictionary: { [key: string]: Value } = {}

    while (true) {
      const type = cursor.readUint8OrThrow()

      if (type === 0)
        break

      const klength = cursor.readUint32OrThrow(true)
      const kstring = cursor.readUtf8OrThrow(klength)

      const vlength = cursor.readUint32OrThrow(true)
      const vbytes = cursor.readOrThrow(vlength)

      if (type === Value.UInt32.type) {
        dictionary[kstring] = Readable.readFromBytesOrThrow(Value.UInt32, vbytes.get())
        continue
      }

      if (type === Value.UInt64.type) {
        dictionary[kstring] = Readable.readFromBytesOrThrow(Value.UInt64, vbytes.get())
        continue
      }

      if (type === Value.Boolean.type) {
        dictionary[kstring] = Readable.readFromBytesOrThrow(Value.Boolean, vbytes.get())
        continue
      }

      if (type === Value.Int32.type) {
        dictionary[kstring] = Readable.readFromBytesOrThrow(Value.Int32, vbytes.get())
        continue
      }

      if (type === Value.Int64.type) {
        dictionary[kstring] = Readable.readFromBytesOrThrow(Value.Int64, vbytes.get())
        continue
      }

      if (type === Value.String.type) {
        dictionary[kstring] = Readable.readFromBytesOrThrow(Value.String, vbytes.get())
        continue
      }

      if (type === Value.Bytes.type) {
        dictionary[kstring] = Readable.readFromBytesOrThrow(Value.Bytes, vbytes.get())
        continue
      }

      throw new Error()
    }

    return new Dictionary(dictionary)
  }

}

export type Value =
  | Value.UInt32
  | Value.UInt64
  | Value.Boolean
  | Value.Int32
  | Value.Int64
  | Value.String
  | Value.Bytes

export namespace Value {

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
      return new Bytes(cursor.readOrThrow(cursor.remaining))
    }

  }

}
