// deno-lint-ignore-file no-namespace

import type { Cursor } from "@hazae41/cursor"

export type Compression =
  | typeof Compression.None
  | typeof Compression.Gzip

export namespace Compression {

  export namespace None {

    export const type = 0x00

    export function clone(): typeof None {
      return None
    }

    export function size(): number {
      return 4
    }

    export function write(cursor: Cursor<ArrayBuffer>) {
      cursor.writeUint32(type, true)
    }

  }

  export namespace Gzip {

    export const type = 0x01

    export function clone(): typeof Gzip {
      return Gzip
    }

    export function size(): number {
      return 4
    }

    export function write(cursor: Cursor<ArrayBuffer>) {
      cursor.writeUint32(type, true)
    }

  }

}

export namespace Compression {

  export function read(cursor: Cursor<ArrayBuffer>): Compression {
    const value = cursor.readUint32(true)

    if (value === Compression.None.type)
      return Compression.None
    if (value === Compression.Gzip.type)
      return Compression.Gzip

    throw new Error()
  }

}