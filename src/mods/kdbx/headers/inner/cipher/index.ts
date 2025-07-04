import { Cursor } from "@hazae41/cursor"

export type Cipher =
  | typeof Cipher.ArcFourVariant
  | typeof Cipher.Salsa20
  | typeof Cipher.ChaCha20

export namespace Cipher {

  export namespace ArcFourVariant {

    export const type = 0x01

    export function cloneOrThrow() {
      return ArcFourVariant
    }

    export function sizeOrThrow() {
      return 4
    }

    export function writeOrThrow(cursor: Cursor) {
      cursor.writeUint32OrThrow(type, true)
    }

  }

  export namespace Salsa20 {

    export const type = 0x02

    export function cloneOrThrow() {
      return Salsa20
    }

    export function sizeOrThrow() {
      return 4
    }

    export function writeOrThrow(cursor: Cursor) {
      cursor.writeUint32OrThrow(type, true)
    }

  }

  export namespace ChaCha20 {

    export const type = 0x03

    export function cloneOrThrow() {
      return ChaCha20
    }

    export function sizeOrThrow() {
      return 4
    }

    export function writeOrThrow(cursor: Cursor) {
      cursor.writeUint32OrThrow(type, true)
    }

  }

}

export namespace Cipher {

  export function readOrThrow(cursor: Cursor) {
    const value = cursor.readUint32OrThrow(true)

    if (value === Cipher.ArcFourVariant.type)
      return Cipher.ArcFourVariant
    if (value === Cipher.Salsa20.type)
      return Cipher.Salsa20
    if (value === Cipher.ChaCha20.type)
      return Cipher.ChaCha20

    throw new Error()
  }

}