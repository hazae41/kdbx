import type { Uint8Array } from "@hazae41/bytes"

export type Copiable<T extends number = number> =
  | Uncopied<T>
  | Copied<T>

export class Uncopied<T extends number = number> {

  constructor(
    readonly value: Uint8Array<T>
  ) { }

  get() {
    return this.value
  }

  copy() {
    return new Uint8Array(this.value)
  }

}

export class Copied<T extends number = number> {

  constructor(
    readonly value: Uint8Array<T>
  ) { }

  get() {
    return this.value
  }

  copy() {
    return this.value
  }

}