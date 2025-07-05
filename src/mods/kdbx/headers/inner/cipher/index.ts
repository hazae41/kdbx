import { ChaCha20Poly1305Wasm } from "@hazae41/chacha20poly1305.wasm"
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

    export function decryptOrThrow(key: Uint8Array, nonce: Uint8Array, data: Uint8Array): never {
      throw new Error("ArcFourVariant is not implemented yet")
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

    export function decryptOrThrow(key: Uint8Array, nonce: Uint8Array, data: Uint8Array): never {
      throw new Error("Salsa20 is not implemented yet")
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

    export function decryptOrThrow(key: Uint8Array, nonce: Uint8Array, data: Uint8Array): Uint8Array {
      using mkey = new ChaCha20Poly1305Wasm.Memory(key)
      using mnonce = new ChaCha20Poly1305Wasm.Memory(nonce)
      using mdata = new ChaCha20Poly1305Wasm.Memory(data)

      using cipher = new ChaCha20Poly1305Wasm.ChaCha20Cipher(mkey, mnonce)

      cipher.apply_keystream(mdata)

      return new Uint8Array(mdata.bytes)
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