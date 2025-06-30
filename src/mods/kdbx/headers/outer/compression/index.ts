import { Cursor } from "@hazae41/cursor"

export type Compression =
  | typeof Compression.None
  | typeof Compression.Gzip

export namespace Compression {

  export namespace None {

    export const type = 0x00

    export function writeOrThrow(cursor: Cursor) {
      cursor.writeUint32OrThrow(type, true)
    }

  }

  export namespace Gzip {

    export const type = 0x01

    export function writeOrThrow(cursor: Cursor) {
      cursor.writeUint32OrThrow(type, true)
    }

  }

}

export namespace Compression {

  export function readOrThrow(cursor: Cursor) {
    const value = cursor.readUint32OrThrow(true)

    if (value === Compression.None.type)
      return Compression.None
    if (value === Compression.Gzip.type)
      return Compression.Gzip

    throw new Error()
  }

}