import { Argon2 } from "@hazae41/argon2.wasm"
import { Base64 } from "@hazae41/base64"
import { Readable, Writable } from "@hazae41/binary"
import { ChaCha20Poly1305Wasm } from "@hazae41/chacha20poly1305.wasm"
import { JSDOM } from "jsdom"
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

function rename(node: Node, oldName: string, newName: string) {
  if (node.nodeName === "Value") {
    if (node.textContent === oldName)
      node.textContent = newName
    return
  }

  for (let i = 0; i < node.childNodes.length; i++)
    rename(node.childNodes[i], oldName, newName)
  return
}


await Argon2.initBundled()
await ChaCha20Poly1305Wasm.initBundled()

globalThis.DOMParser = window.DOMParser
globalThis.XMLSerializer = window.XMLSerializer

const password = await CompositeKey.digestOrThrow(await PasswordKey.digestOrThrow(new TextEncoder().encode("test")))

const encrypted = Readable.readFromBytesOrThrow(Database.Encrypted, readFileSync("./local/input.kdbx")).cloneOrThrow()
const decrypted = await encrypted.decryptOrThrow(password)

const cipher = await decrypted.body.headers.getCipherOrThrow()

const document = decrypted.body.content.intoOrThrow()
const $$values = document.querySelectorAll("Value[Protected='True']")

for (let i = 0; i < $$values.length; i++) {
  const $value = $$values[i]

  const encrypted = Base64.fromBuffer().decodePaddedOrThrow($value.innerHTML).bytes
  const decrypted = cipher.applyOrThrow(encrypted)

  console.log(new TextDecoder().decode(decrypted))
}

// console.log(XML.format(document))

const decrypted2 = await decrypted.rotateOrThrow(password)
const encrypted2 = await decrypted2.encryptOrThrow()

// console.log(decrypted.body.headers.value.value)

writeFileSync("./local/output.kdbx", Writable.writeToBytesOrThrow(encrypted2))