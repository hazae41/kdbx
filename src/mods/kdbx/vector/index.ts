import { Opaque, Readable, Writable } from "@hazae41/binary";
import { Cursor } from "@hazae41/cursor";
import { Optional } from "libs/optional/index.js";
import { Struct } from "libs/struct/index.js";
import { TLV } from "libs/tlv/index.js";

export class Vector<T extends { [index: number]: Optional<readonly Struct[]> }> {

  constructor(
    readonly bytes: Opaque,
    readonly value: T
  ) { }

  sizeOrThrow() {
    return this.bytes.sizeOrThrow();
  }

  writeOrThrow(cursor: Cursor<ArrayBuffer>) {
    this.bytes.writeOrThrow(cursor)
  }

  cloneOrThrow() {
    return Readable.readFromBytesOrThrow(Vector, Writable.writeToBytesOrThrow(this)) as any as this
  }

}

export namespace Vector {

  export function initOrThrow<T extends { [index: number]: Optional<readonly Struct[]> }>(indexed: T) {
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

    const sized = entries.reduce((x, r) => x + r.sizeOrThrow(), 0) + TLV.Empty.sizeOrThrow()
    const bytes = new Opaque(new Uint8Array(sized))

    const cursor = new Cursor(bytes.bytes)

    for (const entry of entries)
      entry.writeOrThrow(cursor)

    TLV.Empty.writeOrThrow(cursor)

    return new Vector(bytes, indexed);
  }

  export function readOrThrow(cursor: Cursor<ArrayBuffer>) {
    const start = cursor.offset

    const entries = new Array<TLV>();
    const indexed: { [index: number]: Opaque[] } = {};

    while (true) {
      const tlv = TLV.readOrThrow(cursor)

      if (tlv.type === 0)
        break

      entries.push(tlv)

      indexed[tlv.type] ??= []
      indexed[tlv.type].push(tlv.value)

      continue
    }

    const bytes = new Opaque(cursor.bytes.subarray(start, cursor.offset));

    return new Vector(bytes, indexed);
  }

}