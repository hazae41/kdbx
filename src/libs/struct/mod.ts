import { Readable, Writable } from "@hazae41/binary";
import type { Cursor } from "@hazae41/cursor";
import type { Lengthed } from "../lengthed/mod.ts";

export interface Struct {

  sizeOrThrow(): number

  writeOrThrow(cursor: Cursor): void

  cloneOrThrow(): this

}

export class Opaque<T extends ArrayBufferLike = ArrayBufferLike, N extends number = number> {

  constructor(
    readonly bytes: Uint8Array<T> & Lengthed<N>
  ) { }

  sizeOrThrow(): N {
    return this.bytes.length
  }

  writeOrThrow(cursor: Cursor<T>): void {
    cursor.writeOrThrow(this.bytes)
  }

  cloneOrThrow(): Opaque<ArrayBuffer, N> {
    return new Opaque(new Uint8Array(this.bytes) as Uint8Array<ArrayBuffer> & Lengthed<N>)
  }

  readIntoOrThrow<T extends Readable.Infer<T>>(readable: T): Readable.Output<T> {
    return Readable.readFromBytesOrThrow(readable, this.bytes)
  }

}

export namespace Opaque {

  export function readOrThrow<T extends ArrayBufferLike>(cursor: Cursor<T>): Opaque<T> {
    return new Opaque(cursor.readOrThrow(cursor.remaining))
  }

  export function writeFromOrThrow(writable: Writable): Opaque<ArrayBuffer> {
    if (writable instanceof Opaque)
      return writable
    return new Opaque(Writable.writeToBytesOrThrow(writable))
  }

}