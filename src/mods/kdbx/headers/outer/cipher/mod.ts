import { BytesAsUuid, StringAsUuid } from "@/libs/uuid/mod.ts"
import type { Cursor } from "@hazae41/cursor"

export type Cipher =
  | typeof Cipher.Aes128Cbc
  | typeof Cipher.Aes256Cbc
  | typeof Cipher.TwoFishCbc
  | typeof Cipher.ChaCha20

export namespace Cipher {

  export namespace Aes128Cbc {

    export const uuid = "61ab05a1-9464-41c3-8d74-3a563df8dd35"

    export function cloneOrThrow(): typeof Aes128Cbc {
      return Aes128Cbc
    }

    export function sizeOrThrow(): number {
      return 16
    }

    export function writeOrThrow(cursor: Cursor<ArrayBuffer>) {
      cursor.writeOrThrow(BytesAsUuid.from(uuid))
    }

    export namespace IV {

      export const length = 16

    }

    export async function encryptOrThrow(key: Uint8Array<ArrayBuffer>, iv: Uint8Array<ArrayBuffer>, data: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
      const encrypter = await crypto.subtle.importKey("raw", key, { name: "AES-CBC" }, false, ["encrypt"])
      const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-CBC", iv }, encrypter, data))

      return encrypted
    }

    export async function decryptOrThrow(key: Uint8Array<ArrayBuffer>, iv: Uint8Array<ArrayBuffer>, data: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
      const decrypter = await crypto.subtle.importKey("raw", key, { name: "AES-CBC" }, false, ["decrypt"])
      const decrypted = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-CBC", iv }, decrypter, data))

      return decrypted
    }

  }

  export namespace Aes256Cbc {

    export const uuid = "31c1f2e6-bf71-4350-be58-05216afc5aff"

    export function cloneOrThrow(): typeof Aes256Cbc {
      return Aes256Cbc
    }

    export function sizeOrThrow(): number {
      return 16
    }

    export function writeOrThrow(cursor: Cursor<ArrayBuffer>) {
      cursor.writeOrThrow(BytesAsUuid.from(uuid))
    }

    export namespace IV {

      export const length = 16

    }

    export async function encryptOrThrow(key: Uint8Array<ArrayBuffer>, iv: Uint8Array<ArrayBuffer>, data: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
      const encrypter = await crypto.subtle.importKey("raw", key, { name: "AES-CBC" }, false, ["encrypt"])
      const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-CBC", iv }, encrypter, data))

      return encrypted
    }

    export async function decryptOrThrow(key: Uint8Array<ArrayBuffer>, iv: Uint8Array<ArrayBuffer>, data: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
      const decrypter = await crypto.subtle.importKey("raw", key, { name: "AES-CBC" }, false, ["decrypt"])
      const decrypted = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-CBC", iv }, decrypter, data))

      return decrypted
    }

  }

  export namespace TwoFishCbc {

    export const uuid = "ad68f29f-576f-4bb9-a36a-d47af965346c"

    export function cloneOrThrow(): typeof TwoFishCbc {
      return TwoFishCbc
    }

    export function sizeOrThrow(): number {
      return 16
    }

    export function writeOrThrow(cursor: Cursor<ArrayBuffer>) {
      cursor.writeOrThrow(BytesAsUuid.from(uuid))
    }

    export namespace IV {

      export const length = 16

    }

    // deno-lint-ignore require-await
    export async function encryptOrThrow(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Promise<never> {
      throw new Error("TwoFishCbc encryption is not implemented")
    }

    // deno-lint-ignore require-await
    export async function decryptOrThrow(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Promise<never> {
      throw new Error("TwoFishCbc decryption is not implemented")
    }

  }

  export namespace ChaCha20 {

    export const uuid = "d6038a2b-8b6f-4cb5-a524-339a31dbb59a"

    export function cloneOrThrow(): typeof ChaCha20 {
      return ChaCha20
    }

    export function sizeOrThrow(): number {
      return 16
    }

    export function writeOrThrow(cursor: Cursor<ArrayBuffer>) {
      cursor.writeOrThrow(BytesAsUuid.from(uuid))
    }

    export namespace IV {

      export const length = 12

    }

    // deno-lint-ignore require-await
    export async function encryptOrThrow(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Promise<never> {
      throw new Error("ChaCha20 encryption is not implemented")
    }

    // deno-lint-ignore require-await
    export async function decryptOrThrow(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Promise<never> {
      throw new Error("ChaCha20 decryption is not implemented")
    }

  }

}

export namespace Cipher {

  export function readOrThrow(cursor: Cursor<ArrayBuffer>): Cipher {
    const bytes = cursor.readOrThrow(16)
    const uuid = StringAsUuid.from(bytes)

    if (uuid === Cipher.Aes256Cbc.uuid)
      return Cipher.Aes256Cbc
    if (uuid === Cipher.Aes128Cbc.uuid)
      return Cipher.Aes128Cbc
    if (uuid === Cipher.TwoFishCbc.uuid)
      return Cipher.TwoFishCbc
    if (uuid === Cipher.ChaCha20.uuid)
      return Cipher.ChaCha20

    throw new Error()
  }

}