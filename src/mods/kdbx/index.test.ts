import { Argon2 } from "@hazae41/argon2.wasm"
import { Writable } from "@hazae41/binary"
import { Cursor } from "@hazae41/cursor"
import { DOMParser, XMLSerializer } from "@xmldom/xmldom"
import { Bytes } from "libs/bytes/index.js"
import { readFileSync } from "node:fs"
import { CompositeKey, Database, PasswordKey } from "./index.js"

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

function format(text: string, tab: string = "  ") {
  let result = ""
  let indent = 0

  const nodes = text.split(/>\s*</)

  for (const node of nodes) {
    if (node.match(/^\/\w/))
      indent--

    result += tab.repeat(indent) + '<' + node + '>\r\n';

    if (node.match(/^<?\w[^>]*[^\/]$/))
      indent++

    continue
  }

  return result.slice(1, result.length - 3);
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

globalThis.DOMParser = DOMParser as any
globalThis.XMLSerializer = XMLSerializer as any

const composite = await CompositeKey.digestOrThrow(await PasswordKey.digestOrThrow(new TextEncoder().encode("test")))

const encrypted = Database.Encrypted.readOrThrow(new Cursor(readFileSync("./local/test.kdbx")))
const decrypted = await encrypted.decryptOrThrow(await encrypted.digestOrThrow(encrypted.deriveOrThrow(composite)))

console.log(Bytes.equals(Writable.writeToBytesOrThrow(encrypted), readFileSync("./local/test.kdbx")))

// rename(decrypted.body.content as any, "nom d'utilisateur", "lol")

// console.log(format(new XMLSerializer().serializeToString(decrypted.body.content as any)))