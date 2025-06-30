import { Cursor } from "@hazae41/cursor"
import { BytesAsUuid, StringAsUuid } from "libs/uuid/index.js"

export namespace Cipher {

  export namespace Aes128Cbc {

    export const uuid = "61ab05a1-9464-41c3-8d74-3a563df8dd35"

    export function writeOrThrow(cursor: Cursor) {
      const copiable = BytesAsUuid.from(uuid)

      cursor.writeOrThrow(copiable.bytes)
    }

  }

  export const Aes128Cbc = new Cipher("61ab05a1-9464-41c3-8d74-3a563df8dd35")

  export const Aes256Cbc = new Cipher("31c1f2e6-bf71-4350-be58-05216afc5aff")

  export const TwoFishCbc = new Cipher("ad68f29f-576f-4bb9-a36a-d47af965346c")

  export const ChaCha20 = new Cipher("d6038a2b-8b6f-4cb5-a524-339a31dbb59a")

}

export namespace Cipher {

  export function readOrThrow(cursor: Cursor) {
    const bytes = cursor.readOrThrow(16)
    const uuid = StringAsUuid.from(bytes)

    if (uuid === Aes256Cbc.uuid)
      return Aes256Cbc
    if (uuid === ChaCha20.uuid)
      return ChaCha20

    throw new Error()
  }

}