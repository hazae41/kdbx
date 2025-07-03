import { Clonable, Opaque, Writable } from "@hazae41/binary"
import { Cursor } from "@hazae41/cursor"

export class TLV<T extends Writable & Clonable> {

  constructor(
    readonly type: number,
    readonly value: T
  ) { }

  sizeOrThrow() {
    return 1 + 4 + this.value.sizeOrThrow()
  }

  writeOrThrow(cursor: Cursor) {
    cursor.writeUint8OrThrow(this.type)
    cursor.writeUint32OrThrow(this.value.sizeOrThrow(), true)
    this.value.writeOrThrow(cursor)
  }

  cloneOrThrow() {
    return new TLV(this.type, this.value.cloneOrThrow())
  }

}

export namespace TLV {

  export function readOrThrow(cursor: Cursor) {
    const type = cursor.readUint8OrThrow()
    const length = cursor.readUint32OrThrow(true)
    const bytes = new Opaque(cursor.readOrThrow(length))

    return new TLV(type, bytes)
  }

}