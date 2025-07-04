import { Opaque, Writable } from "@hazae41/binary";
import { Cursor } from "@hazae41/cursor";
import { Optional } from "libs/optional/index.js";
import { TLV } from "libs/tlv/index.js";

export class Vector<T extends { [index: number]: Optional<readonly Writable[]> }> {

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

}

export namespace Vector {

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