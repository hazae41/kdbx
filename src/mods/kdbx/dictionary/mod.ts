// deno-lint-ignore-file no-namespace

import type { Nullable } from "@/libs/nullable/mod.ts";
import { Readable, Unknown, Writable } from "@hazae41/binary";
import { Cursor } from "@hazae41/cursor";

export class Dictionary<T extends { [key: string]: Value } = { [key: string]: Value }> {

  constructor(
    readonly version: Dictionary.Version,
    readonly entries: Entries<T>
  ) { }

  sizeOrThrow(): number {
    return this.version.sizeOrThrow() + this.entries.sizeOrThrow() + 1
  }

  writeOrThrow(cursor: Cursor<ArrayBuffer>) {
    this.version.writeOrThrow(cursor)
    this.entries.writeOrThrow(cursor)

    cursor.writeUint8OrThrow(0x00)
  }

  cloneOrThrow(): Dictionary<T> {
    return new Dictionary(this.version.cloneOrThrow(), this.entries.cloneOrThrow())
  }

}

export namespace Dictionary {

  export class Version {

    constructor(
      readonly minor: number,
      readonly major: number
    ) { }

    sizeOrThrow(): number {
      return 1 + 1
    }

    writeOrThrow(cursor: Cursor<ArrayBuffer>) {
      cursor.writeUint8OrThrow(this.minor)
      cursor.writeUint8OrThrow(this.major)
    }

    cloneOrThrow(): Version {
      return this
    }

  }

  export namespace Version {

    export function readOrThrow(cursor: Cursor<ArrayBuffer>): Version {
      const minor = cursor.readUint8OrThrow()
      const major = cursor.readUint8OrThrow()

      return new Version(minor, major)
    }

  }

  export function initOrThrow<T extends { [key: string]: Value }>(version: Version, entries: T): Dictionary<T> {
    return new Dictionary(version, Entries.initOrThrow(entries))
  }

  export function readOrThrow(cursor: Cursor<ArrayBuffer>): Dictionary<{ [key: string]: Value }> {
    const version = Version.readOrThrow(cursor)

    if (version.major !== 1)
      throw new Error()

    const entries = Entries.readOrThrow(cursor)

    return new Dictionary(version, entries)
  }

}

export class Entries<T extends { [key: string]: Value } = { [key: string]: Value }> {

  constructor(
    readonly bytes: Unknown<ArrayBuffer>,
    readonly value: T,
  ) { }

  sizeOrThrow(): number {
    return this.bytes.bytes.length
  }

  writeOrThrow(cursor: Cursor<ArrayBuffer>) {
    cursor.writeOrThrow(this.bytes.bytes)
  }

  cloneOrThrow(): Entries<T> {
    return Readable.readFromBytesOrThrow(Entries, Writable.writeToBytesOrThrow(this)) as unknown as Entries<T>
  }

}

export namespace Entries {

  export function initOrThrow<T extends { [key: string]: Value }>(value: T): Entries<T> {
    const entries = new Array<Entry<Value>>()

    for (const key in value)
      entries.push(new Entry(Key.initOrThrow(key), value[key]))

    const sized = entries.reduce((x, r) => x + r.sizeOrThrow(), 0)
    const bytes = new Unknown(new Uint8Array(sized))

    const cursor = new Cursor(bytes.bytes)

    for (const entry of entries)
      entry.writeOrThrow(cursor)

    return new Entries(bytes, value)
  }

  export function readOrThrow(cursor: Cursor<ArrayBuffer>): Entries<{ [key: string]: Value }> {
    const start = cursor.offset

    const entries = new Array<Entry<Value>>()
    const indexed: { [key: string]: Value } = {}

    while (true) {
      const record = Entry.readOrThrow(cursor)

      if (record == null)
        break

      entries.push(record)

      indexed[record.key.value] = record.val

      continue
    }

    const bytes = new Unknown(cursor.bytes.subarray(start, cursor.offset))

    return new Entries(bytes, indexed)
  }

}
export class Entry<T extends Value> {

  constructor(
    readonly key: Key,
    readonly val: T
  ) { }

  sizeOrThrow(): number {
    return 1 + 4 + this.key.sizeOrThrow() + 4 + this.val.sizeOrThrow()
  }

  writeOrThrow(cursor: Cursor<ArrayBuffer>) {
    cursor.writeUint8OrThrow(this.val.type)

    const klength = this.key.sizeOrThrow()
    cursor.writeUint32OrThrow(klength, true)
    this.key.writeOrThrow(cursor)

    const vlength = this.val.sizeOrThrow()
    cursor.writeUint32OrThrow(vlength, true)
    this.val.writeOrThrow(cursor)
  }

}

export namespace Entry {

  export function readOrThrow(cursor: Cursor<ArrayBuffer>): Nullable<Entry<Value>> {
    const type = cursor.readUint8OrThrow()

    if (type === 0)
      return

    const klength = cursor.readUint32OrThrow(true)
    const kbytes = cursor.readOrThrow(klength)
    const kstring = new TextDecoder().decode(kbytes)

    const vlength = cursor.readUint32OrThrow(true)
    const vbytes = cursor.readOrThrow(vlength)

    const key = new Key(new Unknown(kbytes), kstring)
    const value = Value.parseOrThrow(type, new Unknown(vbytes))

    return new Entry(key, value)
  }

}

export class Key {

  constructor(
    readonly bytes: Unknown<ArrayBuffer>,
    readonly value: string
  ) { }

  sizeOrThrow(): number {
    return this.bytes.bytes.length
  }

  writeOrThrow(cursor: Cursor<ArrayBuffer>) {
    cursor.writeOrThrow(this.bytes.bytes)
  }

}

export namespace Key {

  export function initOrThrow(value: string): Key {
    const bytes = new TextEncoder().encode(value)
    return new Key(new Unknown(bytes), value)
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

  export function parseOrThrow(type: number, value: Unknown<ArrayBuffer>): Value {
    if (type === UInt32.type)
      return Readable.readFromBytesOrThrow(UInt32, value.bytes)

    if (type === UInt64.type)
      return Readable.readFromBytesOrThrow(UInt64, value.bytes)

    if (type === Boolean.type)
      return Readable.readFromBytesOrThrow(Boolean, value.bytes)

    if (type === Int32.type)
      return Readable.readFromBytesOrThrow(Int32, value.bytes)

    if (type === Int64.type)
      return Readable.readFromBytesOrThrow(Int64, value.bytes)

    if (type === String.type)
      return Readable.readFromBytesOrThrow(String, value.bytes)

    if (type === Bytes.type)
      return Readable.readFromBytesOrThrow(Bytes, value.bytes)

    throw new Error()
  }

  export class UInt32<T extends number = number> {
    readonly #class = UInt32

    constructor(
      readonly value: T
    ) { }

    get type(): number {
      return this.#class.type
    }

    sizeOrThrow(): number {
      return 4
    }

    writeOrThrow(cursor: Cursor<ArrayBuffer>) {
      cursor.writeUint32OrThrow(this.value, true)
    }

  }

  export namespace UInt32 {

    export const type = 0x04

    export function readOrThrow(cursor: Cursor<ArrayBuffer>): UInt32 {
      return new UInt32(cursor.readUint32OrThrow(true))
    }

  }

  export class UInt64<T extends bigint = bigint> {
    readonly #class = UInt64

    constructor(
      readonly value: T
    ) { }

    get type(): number {
      return this.#class.type
    }

    sizeOrThrow(): number {
      return 8
    }

    writeOrThrow(cursor: Cursor<ArrayBuffer>) {
      cursor.writeBigUint64OrThrow(this.value, true)
    }

  }

  export namespace UInt64 {

    export const type = 0x05

    export function readOrThrow(cursor: Cursor<ArrayBuffer>): UInt64 {
      return new UInt64(cursor.readBigUint64OrThrow(true))
    }

  }

  export class Boolean {
    readonly #class = Boolean

    constructor(
      readonly value: boolean
    ) { }

    get type(): number {
      return this.#class.type
    }

    sizeOrThrow(): number {
      return 1
    }

    writeOrThrow(cursor: Cursor<ArrayBuffer>) {
      cursor.writeUint8OrThrow(this.value ? 1 : 0)
    }

  }

  export namespace Boolean {

    export const type = 0x08

    export function readOrThrow(cursor: Cursor<ArrayBuffer>): Boolean {
      const value = cursor.readUint8OrThrow()

      if (value !== 0 && value !== 1)
        throw new Error()

      return new Boolean(value === 1)
    }

  }

  export class Int32<T extends number = number> {
    readonly #class = Int32

    constructor(
      readonly value: T
    ) { }

    get type(): number {
      return this.#class.type
    }

    sizeOrThrow(): number {
      return 4
    }

    writeOrThrow(cursor: Cursor<ArrayBuffer>) {
      cursor.writeUint32OrThrow(this.value < 0 ? this.value + (2 ** 32) : this.value, true)
    }

  }

  export namespace Int32 {

    export const type = 0x0C

    export function readOrThrow(cursor: Cursor<ArrayBuffer>): Int32 {
      const uint = cursor.readUint32OrThrow(true)
      const sint = uint > ((2 ** 31) - 1) ? uint - (2 ** 32) : uint

      return new Int32(sint)
    }

  }

  export class Int64<T extends bigint = bigint> {
    readonly #class = Int64

    constructor(
      readonly value: T
    ) { }

    get type(): number {
      return this.#class.type
    }

    sizeOrThrow(): number {
      return 8
    }

    writeOrThrow(cursor: Cursor<ArrayBuffer>) {
      cursor.writeBigUint64OrThrow(this.value < 0n ? this.value + (2n ** 64n) : this.value, true)
    }

  }

  export namespace Int64 {

    export const type = 0x0D

    export function readOrThrow(cursor: Cursor<ArrayBuffer>): Int64 {
      const uint = cursor.readBigUint64OrThrow(true)
      const sint = uint > ((2n ** 63n) - 1n) ? uint - (2n ** 64n) : uint

      return new Int64(sint)
    }

  }

  export class String {
    readonly #class = String

    constructor(
      readonly bytes: Unknown<ArrayBuffer>,
      readonly value: string
    ) { }

    get type(): number {
      return this.#class.type
    }

    sizeOrThrow(): number {
      return this.bytes.bytes.length
    }

    writeOrThrow(cursor: Cursor<ArrayBuffer>) {
      cursor.writeOrThrow(this.bytes.bytes)
    }

  }

  export namespace String {

    export const type = 0x18

    export function readOrThrow(cursor: Cursor<ArrayBuffer>): String {
      const bytes = cursor.readOrThrow(cursor.remaining)
      const value = new TextDecoder().decode(bytes)

      return new String(new Unknown(bytes), value)
    }

  }

  export class Bytes<N extends number = number> {
    readonly #class = Bytes

    constructor(
      readonly value: Unknown<ArrayBuffer>
    ) { }

    get type(): number {
      return this.#class.type
    }

    sizeOrThrow(): number {
      return this.value.bytes.length
    }

    writeOrThrow(cursor: Cursor<ArrayBuffer>) {
      cursor.writeOrThrow(this.value.bytes)
    }

  }

  export namespace Bytes {

    export const type = 0x42

    export function readOrThrow(cursor: Cursor<ArrayBuffer>): Bytes {
      return new Bytes(new Unknown(cursor.readOrThrow(cursor.remaining)))
    }

  }

}
