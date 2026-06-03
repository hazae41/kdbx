// deno-lint-ignore-file no-namespace

import type { Nullable } from "@/libs/nullable/mod.ts";
import { Readable, Unknown, Writable } from "@hazae41/binary";
import { Cursor } from "@hazae41/cursor";

export class Dictionary<T extends { [key: string]: Value } = { [key: string]: Value }> {

  constructor(
    readonly version: Dictionary.Version,
    readonly entries: Entries<T>
  ) { }

  size(): number {
    return this.version.size() + this.entries.size() + 1
  }

  write(cursor: Cursor<ArrayBuffer>) {
    this.version.write(cursor)
    this.entries.write(cursor)

    cursor.writeUint8(0x00)
  }

  clone(): Dictionary<T> {
    return new Dictionary(this.version.clone(), this.entries.clone())
  }

}

export namespace Dictionary {

  export class Version {

    constructor(
      readonly minor: number,
      readonly major: number
    ) { }

    size(): number {
      return 1 + 1
    }

    write(cursor: Cursor<ArrayBuffer>) {
      cursor.writeUint8(this.minor)
      cursor.writeUint8(this.major)
    }

    clone(): Version {
      return this
    }

  }

  export namespace Version {

    export function read(cursor: Cursor<ArrayBuffer>): Version {
      const minor = cursor.readUint8()
      const major = cursor.readUint8()

      return new Version(minor, major)
    }

  }

  export function init<T extends { [key: string]: Value }>(version: Version, entries: T): Dictionary<T> {
    return new Dictionary(version, Entries.init(entries))
  }

  export function read(cursor: Cursor<ArrayBuffer>): Dictionary<{ [key: string]: Value }> {
    const version = Version.read(cursor)

    if (version.major !== 1)
      throw new Error()

    const entries = Entries.read(cursor)

    return new Dictionary(version, entries)
  }

}

export class Entries<T extends { [key: string]: Value } = { [key: string]: Value }> {

  constructor(
    readonly bytes: Unknown<ArrayBuffer>,
    readonly value: T,
  ) { }

  size(): number {
    return this.bytes.bytes.length
  }

  write(cursor: Cursor<ArrayBuffer>) {
    cursor.write(this.bytes.bytes)
  }

  clone(): Entries<T> {
    return Readable.readFromBytes(Entries, Writable.writeToBytes(this)) as unknown as Entries<T>
  }

}

export namespace Entries {

  export function init<T extends { [key: string]: Value }>(value: T): Entries<T> {
    const entries = new Array<Entry<Value>>()

    for (const key in value)
      entries.push(new Entry(Key.init(key), value[key]))

    const sized = entries.reduce((x, r) => x + r.size(), 0)
    const bytes = new Unknown(new Uint8Array(sized))

    const cursor = new Cursor(bytes.bytes)

    for (const entry of entries)
      entry.write(cursor)

    return new Entries(bytes, value)
  }

  export function read(cursor: Cursor<ArrayBuffer>): Entries<{ [key: string]: Value }> {
    const start = cursor.offset

    const entries = new Array<Entry<Value>>()
    const indexed: { [key: string]: Value } = {}

    while (true) {
      const record = Entry.read(cursor)

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

  size(): number {
    return 1 + 4 + this.key.size() + 4 + this.val.size()
  }

  write(cursor: Cursor<ArrayBuffer>) {
    cursor.writeUint8(this.val.type)

    const klength = this.key.size()
    cursor.writeUint32(klength, true)
    this.key.write(cursor)

    const vlength = this.val.size()
    cursor.writeUint32(vlength, true)
    this.val.write(cursor)
  }

}

export namespace Entry {

  export function read(cursor: Cursor<ArrayBuffer>): Nullable<Entry<Value>> {
    const type = cursor.readUint8()

    if (type === 0)
      return

    const klength = cursor.readUint32(true)
    const kbytes = cursor.read(klength)
    const kstring = new TextDecoder().decode(kbytes)

    const vlength = cursor.readUint32(true)
    const vbytes = cursor.read(vlength)

    const key = new Key(new Unknown(kbytes), kstring)
    const value = Value.parse(type, new Unknown(vbytes))

    return new Entry(key, value)
  }

}

export class Key {

  constructor(
    readonly bytes: Unknown<ArrayBuffer>,
    readonly value: string
  ) { }

  size(): number {
    return this.bytes.bytes.length
  }

  write(cursor: Cursor<ArrayBuffer>) {
    cursor.write(this.bytes.bytes)
  }

}

export namespace Key {

  export function init(value: string): Key {
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

  export function parse(type: number, value: Unknown<ArrayBuffer>): Value {
    if (type === UInt32.type)
      return Readable.readFromBytes(UInt32, value.bytes)

    if (type === UInt64.type)
      return Readable.readFromBytes(UInt64, value.bytes)

    if (type === Boolean.type)
      return Readable.readFromBytes(Boolean, value.bytes)

    if (type === Int32.type)
      return Readable.readFromBytes(Int32, value.bytes)

    if (type === Int64.type)
      return Readable.readFromBytes(Int64, value.bytes)

    if (type === String.type)
      return Readable.readFromBytes(String, value.bytes)

    if (type === Bytes.type)
      return Readable.readFromBytes(Bytes, value.bytes)

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

    size(): number {
      return 4
    }

    write(cursor: Cursor<ArrayBuffer>) {
      cursor.writeUint32(this.value, true)
    }

  }

  export namespace UInt32 {

    export const type = 0x04

    export function read(cursor: Cursor<ArrayBuffer>): UInt32 {
      return new UInt32(cursor.readUint32(true))
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

    size(): number {
      return 8
    }

    write(cursor: Cursor<ArrayBuffer>) {
      cursor.writeBigUint64(this.value, true)
    }

  }

  export namespace UInt64 {

    export const type = 0x05

    export function read(cursor: Cursor<ArrayBuffer>): UInt64 {
      return new UInt64(cursor.readBigUint64(true))
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

    size(): number {
      return 1
    }

    write(cursor: Cursor<ArrayBuffer>) {
      cursor.writeUint8(this.value ? 1 : 0)
    }

  }

  export namespace Boolean {

    export const type = 0x08

    export function read(cursor: Cursor<ArrayBuffer>): Boolean {
      const value = cursor.readUint8()

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

    size(): number {
      return 4
    }

    write(cursor: Cursor<ArrayBuffer>) {
      cursor.writeUint32(this.value < 0 ? this.value + (2 ** 32) : this.value, true)
    }

  }

  export namespace Int32 {

    export const type = 0x0C

    export function read(cursor: Cursor<ArrayBuffer>): Int32 {
      const uint = cursor.readUint32(true)
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

    size(): number {
      return 8
    }

    write(cursor: Cursor<ArrayBuffer>) {
      cursor.writeBigUint64(this.value < 0n ? this.value + (2n ** 64n) : this.value, true)
    }

  }

  export namespace Int64 {

    export const type = 0x0D

    export function read(cursor: Cursor<ArrayBuffer>): Int64 {
      const uint = cursor.readBigUint64(true)
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

    size(): number {
      return this.bytes.bytes.length
    }

    write(cursor: Cursor<ArrayBuffer>) {
      cursor.write(this.bytes.bytes)
    }

  }

  export namespace String {

    export const type = 0x18

    export function read(cursor: Cursor<ArrayBuffer>): String {
      const bytes = cursor.read(cursor.remaining)
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

    size(): number {
      return this.value.bytes.length
    }

    write(cursor: Cursor<ArrayBuffer>) {
      cursor.write(this.value.bytes)
    }

  }

  export namespace Bytes {

    export const type = 0x42

    export function read(cursor: Cursor<ArrayBuffer>): Bytes {
      return new Bytes(new Unknown(cursor.read(cursor.remaining)))
    }

  }

}
