// deno-lint-ignore-file no-namespace

import { Cursor } from "@hazae41/cursor";

export namespace Cursors {

  export function* splitOrThrow<T extends ArrayBufferLike = ArrayBufferLike>(cursor: Cursor<T>, length: number): Generator<Uint8Array<T>, void> {
    while (cursor.remaining >= length)
      yield cursor.readOrThrow(length)

    if (cursor.remaining)
      yield cursor.readOrThrow(cursor.remaining)

    return
  }

}