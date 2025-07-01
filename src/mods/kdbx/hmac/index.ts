import { Writable } from "@hazae41/binary"
import { Cursor } from "@hazae41/cursor"
import { Copiable } from "@hazae41/uncopy"

export class PreHmacKey {

  constructor(
    readonly index: bigint,
    readonly major: Copiable<32>,
  ) { }

  sizeOrThrow() {
    return 8 + this.major.get().length
  }

  writeOrThrow(cursor: Cursor) {
    cursor.writeUint64OrThrow(this.index, true)
    cursor.writeOrThrow(this.major.get())
  }

  async digestOrThrow() {
    const preHmacKeyBytes = Writable.writeToBytesOrThrow(this)

    const hmacKeyBytes = new Uint8Array(await crypto.subtle.digest("SHA-512", preHmacKeyBytes))
    const hmacKeyCrypto = await crypto.subtle.importKey("raw", hmacKeyBytes, { name: "HMAC", hash: "SHA-256" }, true, ["sign", "verify"])

    return new HmacKey(hmacKeyCrypto)
  }

}

export class HmacKey {

  constructor(
    readonly key: CryptoKey
  ) { }

  static async digestOrThrow(index: bigint, major: Copiable<32>) {
    const struct = new PreHmacKey(index, major)
    const digest = await struct.digestOrThrow()

    return digest
  }

  async signOrThrow(data: Uint8Array) {
    return await crypto.subtle.sign("HMAC", this.key, data)
  }

  async verifyOrThrow(data: Uint8Array, signature: Uint8Array) {
    const result = await crypto.subtle.verify("HMAC", this.key, signature, data)

    if (result !== true)
      throw new Error()

    return true
  }

}