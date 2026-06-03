import { type Unknown, Writable } from "@hazae41/binary";
import type { Cursor } from "@hazae41/cursor";

export class PreHmacKey {

  constructor(
    readonly index: bigint,
    readonly major: Unknown<ArrayBuffer>,
  ) { }

  size(): number {
    return 8 + this.major.bytes.length
  }

  write(cursor: Cursor<ArrayBuffer>) {
    cursor.writeBigUint64(this.index, true)
    cursor.write(this.major.bytes)
  }

  async digest() {
    const bytes = Writable.writeToBytes(this)

    const digest = new Uint8Array(await crypto.subtle.digest("SHA-512", bytes))

    const key = await crypto.subtle.importKey("raw", digest, { name: "HMAC", hash: "SHA-256" }, true, ["sign", "verify"])

    return new HmacKey(key)
  }

}

export class HmacKey {

  constructor(
    readonly key: CryptoKey
  ) { }

  async sign(data: Uint8Array<ArrayBuffer>) {
    return new Uint8Array(await crypto.subtle.sign("HMAC", this.key, data))
  }

  async verify(data: Uint8Array<ArrayBuffer>, signature: Uint8Array<ArrayBuffer>) {
    const result = await crypto.subtle.verify("HMAC", this.key, signature, data)

    if (result !== true)
      throw new Error()

    return
  }

}