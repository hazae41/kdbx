// deno-lint-ignore-file no-namespace

import { chaCha20 } from "@hazae41/chacha20"
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

    export function clone(): typeof ArcFourVariant {
      return ArcFourVariant
    }

    export function size(): number {
      return 4
    }

    export function write(cursor: Cursor<ArrayBuffer>) {
      cursor.writeUint32(type, true)
    }

    // deno-lint-ignore require-await
    export async function init(seed: Uint8Array): Promise<never> {
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

    export function clone(): typeof Salsa20 {
      return Salsa20
    }

    export function size(): number {
      return 4
    }

    export function write(cursor: Cursor<ArrayBuffer>) {
      cursor.writeUint32(type, true)
    }

    // deno-lint-ignore require-await
    export async function init(seed: Uint8Array): Promise<never> {
      throw new Error("Salsa20 is not implemented yet")
    }

  }

  export class ChaCha20 {

    constructor(
      readonly cipher: chaCha20.Cipher,
    ) { }

    feed(data: Uint8Array) {
      return this.cipher.feed(data)
    }

  }

  export namespace ChaCha20 {

    export const type = 0x03

    export function clone(): typeof ChaCha20 {
      return ChaCha20
    }

    export function size(): number {
      return 4
    }

    export function write(cursor: Cursor<ArrayBuffer>) {
      cursor.writeUint32(type, true)
    }

    export async function init(seed: Uint8Array<ArrayBuffer>): Promise<ChaCha20> {
      const hashed = new Uint8Array(await crypto.subtle.digest("SHA-512", seed))
      const cursor = new Cursor(hashed)

      const key = cursor.read(32)
      const nonce = cursor.read(12)

      const cipher = chaCha20.Cipher.import(key, nonce)

      return new ChaCha20(cipher)
    }

  }

}

export namespace Cipher {

  export function read(cursor: Cursor<ArrayBuffer>): Cipher {
    const value = cursor.readUint32(true)

    if (value === Cipher.ArcFourVariant.type)
      return Cipher.ArcFourVariant
    if (value === Cipher.Salsa20.type)
      return Cipher.Salsa20
    if (value === Cipher.ChaCha20.type)
      return Cipher.ChaCha20

    throw new Error()
  }

}