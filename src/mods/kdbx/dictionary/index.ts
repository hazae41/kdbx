import { Readable } from "@hazae41/binary"
import { Cursor } from "@hazae41/cursor"
import { Copiable } from "@hazae41/uncopy"

export class Dictionary {

  constructor(
    readonly versi: Dictionary.Version,
    readonly array: Record<Value>[],
    readonly value: { [key: string]: Value }
  ) { }

  sizeOrThrow() {
    return this.versi.sizeOrThrow() + this.array.reduce((x, r) => x + r.sizeOrThrow(), 0)
  }

  writeOrThrow(cursor: Cursor) {
    this.versi.writeOrThrow(cursor)

    for (const record of this.array)
      record.writeOrThrow(cursor)

    cursor.writeUint8OrThrow(0x00)
  }

}

export namespace Dictionary {

  export class Version {

    constructor(
      readonly minor: number,
      readonly major: number
    ) { }

    sizeOrThrow() {
      return 1 + 1
    }

    writeOrThrow(cursor: Cursor) {
      cursor.writeUint8OrThrow(this.minor)
      cursor.writeUint8OrThrow(this.major)
    }

  }

  export namespace Version {

    export function readOrThrow(cursor: Cursor) {
      const minor = cursor.readUint8OrThrow()
      const major = cursor.readUint8OrThrow()

      return new Version(minor, major)
    }

  }

  export function readOrThrow(cursor: Cursor) {
    const version = Version.readOrThrow(cursor)

    if (version.major !== 1)
      throw new Error()

    const array = new Array<Record<Value>>()
    const value: { [key: string]: Value } = {}

    while (true) {
      const record = Record.readOrThrow(cursor)

      if (record == null)
        break

      array.push(record)

      value[record.key.value] = record.value

      continue
    }

    return new Dictionary(version, array, value)
  }

}

export class Record<T extends Value> {

  constructor(
    readonly key: Key,
    readonly value: T
  ) { }

  sizeOrThrow() {
    return 1 + 4 + this.key.sizeOrThrow() + 4 + this.value.sizeOrThrow()
  }

  writeOrThrow(cursor: Cursor) {
    cursor.writeUint8OrThrow(this.value.type)

    const klength = this.key.sizeOrThrow()
    cursor.writeUint32OrThrow(klength, true)
    this.key.writeOrThrow(cursor)

    const vlength = this.value.sizeOrThrow()
    cursor.writeUint32OrThrow(vlength, true)
    this.value.writeOrThrow(cursor)
  }

}

export namespace Record {

  export function readOrThrow(cursor: Cursor) {
    const type = cursor.readUint8OrThrow()

    if (type === 0)
      return

    const klength = cursor.readUint32OrThrow(true)
    const kbytes = cursor.readOrThrow(klength)
    const kstring = new TextDecoder().decode(kbytes.get())

    const vlength = cursor.readUint32OrThrow(true)
    const vbytes = cursor.readOrThrow(vlength)

    const key = new Key(kbytes, kstring)
    const value = Value.parseOrThrow(type, vbytes)

    return new Record(key, value)
  }

}

export class Key {

  constructor(
    readonly bytes: Copiable,
    readonly value: string
  ) { }

  sizeOrThrow() {
    return this.bytes.get().length
  }

  writeOrThrow(cursor: Cursor) {
    cursor.writeOrThrow(this.bytes.get())
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

  export function parseOrThrow(type: number, value: Copiable) {
    if (type === UInt32.type)
      return Readable.readFromBytesOrThrow(UInt32, value.get())

    if (type === UInt64.type)
      return Readable.readFromBytesOrThrow(UInt64, value.get())

    if (type === Boolean.type)
      return Readable.readFromBytesOrThrow(Boolean, value.get())

    if (type === Int32.type)
      return Readable.readFromBytesOrThrow(Int32, value.get())

    if (type === Int64.type)
      return Readable.readFromBytesOrThrow(Int64, value.get())

    if (type === String.type)
      return Readable.readFromBytesOrThrow(String, value.get())

    if (type === Bytes.type)
      return Readable.readFromBytesOrThrow(Bytes, value.get())

    throw new Error()
  }

  export class UInt32 {
    readonly #class = UInt32

    constructor(
      readonly value: number
    ) { }

    get type() {
      return this.#class.type
    }

    sizeOrThrow() {
      return 4
    }

    writeOrThrow(cursor: Cursor) {
      cursor.writeUint32OrThrow(this.value, true)
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

    sizeOrThrow() {
      return 8
    }

    writeOrThrow(cursor: Cursor) {
      cursor.writeUint64OrThrow(this.value, true)
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

    sizeOrThrow() {
      return 1
    }

    writeOrThrow(cursor: Cursor) {
      cursor.writeUint8OrThrow(this.value ? 1 : 0)
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

    sizeOrThrow() {
      return 4
    }

    writeOrThrow(cursor: Cursor) {
      cursor.writeUint32OrThrow(this.value < 0 ? this.value + (2 ** 32) : this.value, true)
    }

  }

  export namespace Int32 {

    export const type = 0x0C

    export function readOrThrow(cursor: Cursor) {
      const uint = cursor.readUint32OrThrow(true)
      const sint = uint > ((2 ** 31) - 1) ? uint - (2 ** 32) : uint

      return new Int32(sint)
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

    sizeOrThrow() {
      return 8
    }

    writeOrThrow(cursor: Cursor) {
      cursor.writeUint64OrThrow(this.value < 0n ? this.value + (2n ** 64n) : this.value, true)
    }

  }

  export namespace Int64 {

    export const type = 0x0D

    export function readOrThrow(cursor: Cursor) {
      const uint = cursor.readUint64OrThrow(true)
      const sint = uint > ((2n ** 63n) - 1n) ? uint - (2n ** 64n) : uint

      return new Int64(sint)
    }

  }

  export class String {
    readonly #class = String

    constructor(
      readonly bytes: Copiable,
      readonly value: string
    ) { }

    get type() {
      return this.#class.type
    }

    sizeOrThrow() {
      return this.bytes.get().length
    }

    writeOrThrow(cursor: Cursor) {
      cursor.writeOrThrow(this.bytes.get())
    }

  }

  export namespace String {

    export const type = 0x18

    export function readOrThrow(cursor: Cursor) {
      const bytes = cursor.readOrThrow(cursor.remaining)
      const value = new TextDecoder().decode(bytes.get())

      return new String(bytes, value)
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

    sizeOrThrow() {
      return this.value.get().length
    }

    writeOrThrow(cursor: Cursor) {
      cursor.writeOrThrow(this.value.get())
    }

  }

  export namespace Bytes {

    export const type = 0x42

    export function readOrThrow(cursor: Cursor) {
      return new Bytes(cursor.readOrThrow(cursor.remaining))
    }

  }

}
