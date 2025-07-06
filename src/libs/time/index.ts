import { Base64 } from "@hazae41/base64"
import { Cursor } from "@hazae41/cursor"

export function now() {
  const seconds = Date.now() / 1000

  const cursor = new Cursor(new Uint8Array(8))
  cursor.writeUint64OrThrow(BigInt(seconds))

  return Base64.get().getOrThrow().encodePaddedOrThrow(cursor.bytes)
}