import { Argon2 } from "@hazae41/argon2"
import { Argon2Wasm } from "@hazae41/argon2.wasm"
import { Readable, Writable } from "@hazae41/binary"
import { ChaCha20Poly1305 } from "@hazae41/chacha20poly1305"
import { ChaCha20Poly1305Wasm } from "@hazae41/chacha20poly1305.wasm"
import { JSDOM } from "jsdom"
import { XML } from "libs/xml/index.js"
import { readFileSync, writeFileSync } from "node:fs"
import { CompositeKey, Database, PasswordKey } from "./index.js"

const { window } = new JSDOM(`<!DOCTYPE html><body></body>`);

async function unzip(zipped: Uint8Array): Promise<Uint8Array> {
  const dezipper = new DecompressionStream("gzip")

  const writer = dezipper.writable.getWriter()
  await writer.write(zipped)
  await writer.close()

  const reader = dezipper.readable.getReader()
  const result = await reader.read()

  if (result.done)
    throw new Error()

  return result.value
}

await Argon2Wasm.initBundled()
await ChaCha20Poly1305Wasm.initBundled()

Argon2.set(Argon2.fromWasm(Argon2Wasm))
ChaCha20Poly1305.set(ChaCha20Poly1305.fromWasm(ChaCha20Poly1305Wasm))

globalThis.DOMParser = window.DOMParser
globalThis.XMLSerializer = window.XMLSerializer

const password = await CompositeKey.digestOrThrow(await PasswordKey.digestOrThrow(new TextEncoder().encode("test")))

const encrypted = Readable.readFromBytesOrThrow(Database.Encrypted, readFileSync("./local/input.kdbx")).cloneOrThrow()
const decrypted = await encrypted.decryptOrThrow(password)

const file = decrypted.inner.content.value
const root = file.getRootOrThrow()
const meta = file.getMetaOrThrow()

const group0 = root.getDirectGroupByIndexOrThrow(0)
const subgroup0 = group0.getDirectGroupByIndexOrThrow(0)
const entry0 = subgroup0.getDirectEntryByIndexOrThrow(0)

entry0.cloneToHistoryOrThrow()

entry0.getDirectStringByKeyOrThrow("Title").getValueOrThrow().set("Cloned")
entry0.getDirectStringByKeyOrThrow("Password").getKeyOrThrow().set("PrivateKey")

entry0.getTimesOrThrow().getLastModificationTimeOrThrow().setOrThrow(new Date())
entry0.getTimesOrThrow().getLastAccessTimeOrThrow().setOrThrow(new Date())
entry0.getTimesOrThrow().getUsageCountOrThrow().incrementOrThrow()

console.log(entry0.getHistoryOrNull()?.getDirectEntries().reduce(x => x + 1, 0))

console.log(XML.format(decrypted.inner.content.value.document))

const decrypted2 = await decrypted.rotateOrThrow(password)
const encrypted2 = await decrypted2.encryptOrThrow()

writeFileSync("./local/output.kdbx", Writable.writeToBytesOrThrow(encrypted2))