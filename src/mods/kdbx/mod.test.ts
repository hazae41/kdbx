// deno-lint-ignore-file no-explicit-any no-unused-vars
import { XML } from "@/libs/xml/mod.ts"
import { Readable, Writable } from "@hazae41/binary"
import { Window } from "happy-dom"
import { readFileSync, writeFileSync } from "node:fs"
import { CompositeKey, Database, PasswordKey } from "./mod.ts"

const window = new Window({})

globalThis.DOMParser = window.DOMParser as any
globalThis.XMLSerializer = window.XMLSerializer as any

const password = await CompositeKey.digest(await PasswordKey.digest(new TextEncoder().encode("test")))

const encrypted = Readable.readFromBytes(Database.Encrypted, readFileSync("./local/input.kdbx"))
const decrypted = await encrypted.decrypt(password)

const file = decrypted.inner.content.value
const root = file.getRoot()
const meta = file.getMeta()

const group0 = root.getDirectGroupByIndex(0)
const subgroup0 = group0.getDirectGroupByIndex(0)
const entry0 = subgroup0.getDirectEntryByIndex(0)

entry0.save()

entry0.getStringByKeyOrNull("Title")?.getValue().set("Cloned")
entry0.getStringByKeyOrNull("Password")?.getKey().set("PrivateKey")

entry0.getTimesOrNew().setLastModificationTime()
entry0.getTimesOrNew().setLastAccessTime()
entry0.getTimesOrNew().incrementUsageCount()

console.log(entry0.getHistoryOrNull()?.getDirectEntries().reduce(x => x + 1, 0))

console.log(XML.format(decrypted.inner.content.value.document))

const encrypted2 = await decrypted.encrypt(password)

writeFileSync("./local/output.kdbx", Writable.writeToBytes(encrypted2))