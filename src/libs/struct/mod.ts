import type { Cursor } from "@hazae41/cursor";

export interface Struct {

  sizeOrThrow(): number

  writeOrThrow(cursor: Cursor): void

  cloneOrThrow(): this

}