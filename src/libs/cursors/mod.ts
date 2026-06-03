// deno-lint-ignore-file no-namespace

import { Cursor } from "@hazae41/cursor";

export namespace Cursors {

  export function* split<T extends ArrayBufferLike = ArrayBufferLike>(cursor: Cursor<T>, length: number): Generator<Uint8Array<T>, void> {
    while (cursor.remaining >= length)
      yield cursor.read(length)

    if (cursor.remaining)
      yield cursor.read(cursor.remaining)

    return
  }

}