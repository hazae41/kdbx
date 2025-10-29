// deno-lint-ignore-file no-explicit-any no-unused-vars
import { XML } from "@/libs/xml/mod.ts"
import { argon2 } from "@hazae41/argon2"
import { argon2Wasm } from "@hazae41/argon2-wasm"
import { Readable, Writable } from "@hazae41/binary"
import { chaCha20Poly1305 } from "@hazae41/chacha20poly1305"
import { chaCha20Poly1305Wasm } from "@hazae41/chacha20poly1305-wasm"
import { Window } from "happy-dom"
import { readFileSync, writeFileSync } from "node:fs"
import { CompositeKey, Database, PasswordKey } from "./mod.ts"

await argon2Wasm.load()
await chaCha20Poly1305Wasm.load()

argon2.set(argon2.fromWasm(argon2Wasm))
chaCha20Poly1305.set(chaCha20Poly1305.fromWasm(chaCha20Poly1305Wasm))

const window = new Window({})

globalThis.DOMParser = window.DOMParser as any
globalThis.XMLSerializer = window.XMLSerializer as any

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