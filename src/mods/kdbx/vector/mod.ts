// deno-lint-ignore-file no-namespace

import type { Optional } from "@/libs/optional/mod.ts";
import type { Struct } from "@/libs/struct/mod.ts";
import { TLV } from "@/libs/tlv/mod.ts";
import { Readable, Unknown, Writable } from "@hazae41/binary";
import { Cursor } from "@hazae41/cursor";

export class Vector<T extends { [index: number]: Optional<readonly Struct[]> }> {

  constructor(
    readonly bytes: Unknown<ArrayBuffer>,
    readonly value: T
  ) { }

  size(): number {
    return this.bytes.size();
  }

  write(cursor: Cursor<ArrayBuffer>) {
    this.bytes.write(cursor)
  }

  clone(): Vector<T> {
    return Readable.readFromBytes(Vector, Writable.writeToBytes(this)) as unknown as Vector<T>
  }

}

export namespace Vector {

  export function init<T extends { [index: number]: Optional<readonly Struct[]> }>(indexed: T): Vector<T> {
    const entries = new Array<TLV>();

    for (const key of Object.keys(indexed)) {
      const index = Number(key)
      const array = indexed[index]

      if (array == null)
        continue

      for (const value of array)
        entries.push(new TLV(index, value))

      continue
    }

    const sized = entries.reduce((x, r) => x + r.size(), 0) + TLV.Empty.size()
    const bytes = new Unknown(new Uint8Array(sized))

    const cursor = new Cursor(bytes.bytes)

    for (const entry of entries)
      entry.write(cursor)

    TLV.Empty.write(cursor)

    return new Vector(bytes, indexed);
  }

  export function read(cursor: Cursor<ArrayBuffer>): Vector<{ [index: number]: Unknown<ArrayBuffer>[] }> {
    const start = cursor.offset

    const entries = new Array<TLV>();
    const indexed: { [index: number]: Unknown<ArrayBuffer>[] } = {};

    while (true) {
      const tlv = TLV.read(cursor)

      if (tlv.type === 0)
        break

      entries.push(tlv)

      indexed[tlv.type] ??= []
      indexed[tlv.type].push(tlv.value)

      continue
    }

    const bytes = new Unknown(cursor.bytes.subarray(start, cursor.offset));

    return new Vector(bytes, indexed);
  }

}