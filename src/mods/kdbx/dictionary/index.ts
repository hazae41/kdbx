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
      const record = Record.readOrThrow(cursor)

      if (record == null)
        break

      dictionary[record.key] = record.value

      continue
    }

    return new Dictionary(dictionary)
  }

}

export class Record<T extends Value> {

  constructor(
    readonly key: string,
    readonly value: T
  ) { }

}

export namespace Record {

  export function readOrThrow(cursor: Cursor) {
    const type = cursor.readUint8OrThrow()

    if (type === 0)
      return

    const klength = cursor.readUint32OrThrow(true)
    const kstring = cursor.readUtf8OrThrow(klength)

    const vlength = cursor.readUint32OrThrow(true)
    const vbytes = cursor.readOrThrow(vlength)

    const value = new Value.Unknown(type, vbytes)

    return new Record(kstring, value.parseOrThrow())
  }

}

export type Value =
  | Value.Unknown
  | Value.UInt32
  | Value.UInt64
  | Value.Boolean
  | Value.Int32
  | Value.Int64
  | Value.String
  | Value.Bytes

export namespace Value {

  export class Unknown {

    constructor(
      readonly type: number,
      readonly value: Copiable
    ) { }

    parseOrThrow() {
      if (this.type === UInt32.type)
        return Readable.readFromBytesOrThrow(UInt32, this.value.get())

      if (this.type === UInt64.type)
        return Readable.readFromBytesOrThrow(UInt64, this.value.get())

      if (this.type === Boolean.type)
        return Readable.readFromBytesOrThrow(Boolean, this.value.get())

      if (this.type === Int32.type)
        return Readable.readFromBytesOrThrow(Int32, this.value.get())

      if (this.type === Int64.type)
        return Readable.readFromBytesOrThrow(Int64, this.value.get())

      if (this.type === String.type)
        return Readable.readFromBytesOrThrow(String, this.value.get())

      if (this.type === Bytes.type)
        return Readable.readFromBytesOrThrow(Bytes, this.value.get())

      throw new Error()
    }

  }

  export class UInt32 {
    readonly #class = UInt32

    constructor(
      readonly value: number
    ) { }

    get type() {
      return this.#class.type
    }

  }

  export namespace UInt32 {

    export const type = 0x04

    export function readOrThrow(cursor: Cursor) {
      return new UInt32(cursor.readUint32OrThrow(true))
    }

  }

  export class UInt64 {
    readonly #class = UInt64

    constructor(
      readonly value: bigint
    ) { }

    get type() {
      return this.#class.type
    }

  }

  export namespace UInt64 {

    export const type = 0x05

    export function readOrThrow(cursor: Cursor) {
      return new UInt64(cursor.readUint64OrThrow(true))
    }

  }

  export class Boolean {
    readonly #class = Boolean

    constructor(
      readonly value: boolean
    ) { }

    get type() {
      return this.#class.type
    }

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
    readonly #class = Int32

    constructor(
      readonly value: number
    ) { }

    get type() {
      return this.#class.type
    }

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
    readonly #class = Int64

    constructor(
      readonly value: bigint
    ) { }

    get type() {
      return this.#class.type
    }

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
    readonly #class = String

    constructor(
      readonly value: string
    ) { }

    get type() {
      return this.#class.type
    }

  }

  export namespace String {

    export const type = 0x18

    export function readOrThrow(cursor: Cursor) {
      return new String(cursor.readUtf8OrThrow(cursor.remaining))
    }

  }

  export class Bytes {
    readonly #class = Bytes

    constructor(
      readonly value: Copiable
    ) { }

    get type() {
      return this.#class.type
    }

  }

  export namespace Bytes {

    export const type = 0x42

    export function readOrThrow(cursor: Cursor) {
      return new Bytes(cursor.readOrThrow(cursor.remaining))
    }

  }

}
