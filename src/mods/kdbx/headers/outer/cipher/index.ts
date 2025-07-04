import { Cursor } from "@hazae41/cursor"
import { BytesAsUuid, StringAsUuid } from "libs/uuid/index.js"

export type Cipher =
  | typeof Cipher.Aes128Cbc
  | typeof Cipher.Aes256Cbc
  | typeof Cipher.TwoFishCbc
  | typeof Cipher.ChaCha20

export namespace Cipher {

  export namespace Aes128Cbc {

    export const uuid = "61ab05a1-9464-41c3-8d74-3a563df8dd35"

    export function cloneOrThrow() {
      return Aes128Cbc
    }

    export function sizeOrThrow() {
      return 16
    }

    export function writeOrThrow(cursor: Cursor) {
      cursor.writeOrThrow(BytesAsUuid.from(uuid))
    }

    export namespace IV {

      export const length = 16

    }

  }

  export namespace Aes256Cbc {

    export const uuid = "31c1f2e6-bf71-4350-be58-05216afc5aff"

    export function cloneOrThrow() {
      return Aes256Cbc
    }

    export function sizeOrThrow() {
      return 16
    }

    export function writeOrThrow(cursor: Cursor) {
      cursor.writeOrThrow(BytesAsUuid.from(uuid))
    }

    export namespace IV {

      export const length = 16

    }

    export async function decryptOrThrow(key: Uint8Array, iv: Uint8Array, data: Uint8Array) {
      const decrypter = await crypto.subtle.importKey("raw", key, { name: "AES-CBC" }, false, ["decrypt"])
      const decrypted = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-CBC", iv }, decrypter, data))

      return decrypted
    }

  }

  export namespace TwoFishCbc {

    export const uuid = "ad68f29f-576f-4bb9-a36a-d47af965346c"

    export function cloneOrThrow() {
      return TwoFishCbc
    }

    export function sizeOrThrow() {
      return 16
    }

    export function writeOrThrow(cursor: Cursor) {
      cursor.writeOrThrow(BytesAsUuid.from(uuid))
    }

    export namespace IV {

      export const length = 16

    }

  }

  export namespace ChaCha20 {

    export const uuid = "d6038a2b-8b6f-4cb5-a524-339a31dbb59a"

    export function cloneOrThrow() {
      return ChaCha20
    }

    export function sizeOrThrow() {
      return 16
    }

    export function writeOrThrow(cursor: Cursor) {
      cursor.writeOrThrow(BytesAsUuid.from(uuid))
    }

    export namespace IV {

      export const length = 12

    }

  }

}

export namespace Cipher {

  export function readOrThrow(cursor: Cursor) {
    const bytes = cursor.readOrThrow(16)
    const uuid = StringAsUuid.from(bytes)

    if (uuid === Aes256Cbc.uuid)
      return Aes256Cbc
    if (uuid === Aes128Cbc.uuid)
      return Aes128Cbc
    if (uuid === TwoFishCbc.uuid)
      return TwoFishCbc
    if (uuid === ChaCha20.uuid)
      return ChaCha20

    throw new Error()
  }

}