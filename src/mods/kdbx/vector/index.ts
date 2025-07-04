import { Opaque, Readable, Writable } from "@hazae41/binary";
import { Cursor } from "@hazae41/cursor";
import { Optional } from "libs/optional/index.js";
import { Struct } from "libs/struct/index.js";
import { TLV } from "libs/tlv/index.js";

export class Vector<T extends { [index: number]: Optional<readonly Struct[]> }> {

  constructor(
    readonly entries: TLV[],
    readonly indexed: T
  ) { }

  sizeOrThrow() {
    return this.entries.reduce((x, r) => x + r.sizeOrThrow(), 0) + TLV.Empty.sizeOrThrow()
  }

  writeOrThrow(cursor: Cursor) {
    for (const tlv of this.entries)
      tlv.writeOrThrow(cursor)
    TLV.Empty.writeOrThrow(cursor)
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

    return new Vector(entries, indexed);
  }

  export function readOrThrow(cursor: Cursor) {
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

    return new Vector(entries, indexed);
  }

}