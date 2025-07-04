import { Opaque, Writable } from "@hazae41/binary"
import { Cursor } from "@hazae41/cursor"

export class PreHmacKey {

  constructor(
    readonly index: bigint,
    readonly major: Opaque<64>,
  ) { }

  sizeOrThrow() {
    return 8 + this.major.bytes.length
  }

  writeOrThrow(cursor: Cursor) {
    cursor.writeUint64OrThrow(this.index, true)
    cursor.writeOrThrow(this.major.bytes)
  }

  async digestOrThrow() {
    const bytes = Writable.writeToBytesOrThrow(this)

    const digest = new Uint8Array(await crypto.subtle.digest("SHA-512", bytes))

    const key = await crypto.subtle.importKey("raw", digest, { name: "HMAC", hash: "SHA-256" }, true, ["sign", "verify"])

    return new HmacKey(key)
  }

}

export class HmacKey {

  constructor(
    readonly key: CryptoKey
  ) { }

  async signOrThrow(data: Uint8Array) {
    return new Uint8Array(await crypto.subtle.sign("HMAC", this.key, data))
  }

  async verifyOrThrow(data: Uint8Array, signature: Uint8Array) {
    const result = await crypto.subtle.verify("HMAC", this.key, signature, data)

    if (result !== true)
      throw new Error()

    return
  }

}