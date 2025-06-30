import { Cursor } from "@hazae41/cursor"
import { Copiable } from "@hazae41/uncopy"

export class TLV {

  constructor(
    readonly type: number,
    readonly bytes: Copiable
  ) { }

  static readOrThrow(cursor: Cursor) {
    const type = cursor.readUint8OrThrow()
    const length = cursor.readUint32OrThrow(true)
    const bytes = cursor.readOrThrow(length)

    return new TLV(type, bytes)
  }

}