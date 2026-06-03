import type { Cursor } from "@hazae41/cursor";

export interface Struct {

  size(): number

  write(cursor: Cursor): void

}