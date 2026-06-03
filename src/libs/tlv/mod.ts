// deno-lint-ignore-file no-namespace

import type { Struct } from "@/libs/struct/mod.ts"
import { Readable, Unknown } from "@hazae41/binary"
import type { Cursor } from "@hazae41/cursor"

export class TLV<T extends number = number, V extends Struct = Struct> {

  constructor(
    readonly type: T,
    readonly value: V
  ) { }

  size(): number {
    return 1 + 4 + this.value.size()
  }

  write(cursor: Cursor<ArrayBuffer>) {
    cursor.writeUint8(this.type)
    cursor.writeUint32(this.value.size(), true)
    this.value.write(cursor)
  }

  into<W extends Struct>(this: TLV<T, Unknown<ArrayBuffer>>, readable: Readable<W>): TLV<T, W> {
    return new TLV(this.type, this.value.into(readable))
  }

}

export namespace TLV {

  export namespace Empty {

    export const type = 0x00

    export function size(): number {
      return 1 + 4
    }

    export function write(cursor: Cursor<ArrayBuffer>) {
      cursor.writeUint8(type)
      cursor.writeUint32(0, true)
    }

  }

  export function read(cursor: Cursor<ArrayBuffer>) {
    const type = cursor.readUint8()
    const length = cursor.readUint32(true)
    const bytes = new Unknown(cursor.read(length))

    return new TLV(type, bytes)
  }

}