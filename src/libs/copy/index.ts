export type Copiable =
  | Uncopied
  | Copied

export class Uncopied {

  constructor(
    readonly value: Uint8Array
  ) { }

  get() {
    return this.value
  }

  copy() {
    return new Uint8Array(this.value)
  }

}

export class Copied {

  constructor(
    readonly value: Uint8Array
  ) { }

  get() {
    return this.value
  }

  copy() {
    return this.value
  }

}