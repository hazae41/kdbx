import { ChaCha20Poly1305 } from "@hazae41/chacha20poly1305"
import { Cursor } from "@hazae41/cursor"

export type Cipher =
  | typeof Cipher.ArcFourVariant
  | typeof Cipher.Salsa20
  | typeof Cipher.ChaCha20

export namespace Cipher {

  export class ArcFourVariant {
    constructor() { }
  }

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

    export async function initOrThrow(seed: Uint8Array): Promise<never> {
      throw new Error("ArcFourVariant is not implemented yet")
    }

  }

  export class Salsa20 {
    constructor(
      readonly key: Uint8Array,
      readonly nonce: Uint8Array,
    ) { }
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

    export async function initOrThrow(seed: Uint8Array): Promise<never> {
      throw new Error("Salsa20 is not implemented yet")
    }

  }

  export class ChaCha20 {

    constructor(
      readonly cipher: ChaCha20Poly1305.Abstract.ChaCha20Cipher,
    ) { }

    [Symbol.dispose]() {
      this.cipher[Symbol.dispose]()
    }

    applyOrThrow(data: Uint8Array) {
      const { Memory } = ChaCha20Poly1305.get().getOrThrow()

      const memory = Memory.importOrThrow(data)

      this.cipher.applyOrThrow(memory)

      return memory
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

    export async function initOrThrow(seed: Uint8Array): Promise<ChaCha20> {
      const { Memory, ChaCha20Cipher } = ChaCha20Poly1305.get().getOrThrow()

      const hashed = new Uint8Array(await crypto.subtle.digest("SHA-512", seed))
      const cursor = new Cursor(hashed)

      using key = Memory.importOrThrow(cursor.readOrThrow(32))
      using nonce = Memory.importOrThrow(cursor.readOrThrow(12))

      const cipher = ChaCha20Cipher.importOrThrow(key, nonce)

      return new ChaCha20(cipher)
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