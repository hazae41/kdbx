import { Base64 } from "@hazae41/base64"
import { Cursor } from "@hazae41/cursor"

export namespace Data {

  export class AsString {

    constructor(
      readonly element: Element
    ) { }

    get() {
      return this.element.innerHTML
    }

    set(value: string) {
      this.element.innerHTML = value
    }

  }

  export class AsBoolean {

    constructor(
      readonly element: Element
    ) { }

    get() {
      return this.element.innerHTML === "True"
    }

    set(value: boolean) {
      this.element.innerHTML = value ? "True" : "False"
    }

  }

  export class AsInteger {

    constructor(
      readonly element: Element
    ) { }

    getOrThrow() {
      const value = this.element.innerHTML

      if (!value)
        throw new Error()

      const number = Number(value)

      if (!Number.isSafeInteger(number))
        throw new Error()

      return number
    }

    setOrThrow(value: number) {
      if (!Number.isSafeInteger(value))
        throw new Error()
      this.element.innerHTML = String(value)
    }

    incrementOrThrow() {
      this.setOrThrow(this.getOrThrow() + 1)
    }

  }

  export class AsDate {

    constructor(
      readonly element: Element
    ) { }

    getOrThrow() {
      const value = this.element.innerHTML

      if (!value)
        throw new Error()

      const binary = Base64.decodePaddedOrThrow(value)
      const cursor = new Cursor(binary)

      const raw = cursor.readUint64OrThrow(true)
      const fix = raw - 62135596800n

      return new Date(Number(fix * 1000n))
    }

    setOrThrow(value: Date) {
      const fix = BigInt(value.getTime()) / 1000n
      const raw = fix + 62135596800n

      const cursor = new Cursor(new Uint8Array(8))
      cursor.writeUint64OrThrow(raw, true)

      this.element.innerHTML = Base64.encodePaddedOrThrow(cursor.bytes)
    }

  }

}