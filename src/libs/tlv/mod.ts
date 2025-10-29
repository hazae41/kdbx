import type { Struct } from "@/libs/struct/mod.ts"
import { type Readable, Unknown } from "@hazae41/binary"
import type { Cursor } from "@hazae41/cursor"

export class TLV<T extends number = number, V extends Struct = Struct> {

  constructor(
    readonly type: T,
    readonly value: V
  ) { }

  sizeOrThrow() {
    return 1 + 4 + this.value.sizeOrThrow()
  }

  writeOrThrow(cursor: Cursor<ArrayBuffer>) {
    cursor.writeUint8OrThrow(this.type)
    cursor.writeUint32OrThrow(this.value.sizeOrThrow(), true)
    this.value.writeOrThrow(cursor)
  }

  cloneOrThrow() {
    return new TLV(this.type, this.value.cloneOrThrow())
  }

  readIntoOrThrow<W extends Struct>(this: TLV<T, Unknown>, readable: Readable<W>): TLV<T, W> {
    return new TLV(this.type, this.value.readIntoOrThrow(readable))
  }

}

export namespace TLV {

  export namespace Empty {

    export const type = 0x00

    export function sizeOrThrow() {
      return 1 + 4
    }

    export function writeOrThrow(cursor: Cursor<ArrayBuffer>) {
      cursor.writeUint8OrThrow(type)
      cursor.writeUint32OrThrow(0, true)
    }

  }

  export function readOrThrow(cursor: Cursor<ArrayBuffer>) {
    const type = cursor.readUint8OrThrow()
    const length = cursor.readUint32OrThrow(true)
    const bytes = new Unknown(cursor.readOrThrow(length))

    return new TLV(type, bytes)
  }

}