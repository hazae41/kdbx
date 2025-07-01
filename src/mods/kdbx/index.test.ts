import { Argon2 } from "@hazae41/argon2.wasm"
import { Cursor } from "@hazae41/cursor"
import { DOMParser, XMLSerializer } from "@xmldom/xmldom"
import { Uint8Array } from "libs/bytes/index.js"
import { readFileSync } from "node:fs"
import { Database } from "./index.js"

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

await Argon2.initBundled()

const encrypted = Database.Encrypted.readOrThrow(new Cursor(readFileSync("./local/test.kdbx")))

const passwordString = "test"
const passwordBytes = new TextEncoder().encode(passwordString)

const decrypted = await encrypted.decryptOrThrow(passwordBytes)

const raw = new TextDecoder("utf-8").decode(decrypted.body.content.get())
console.log(format(raw))

const xml = new DOMParser().parseFromString(raw, "text/xml")

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

rename(xml as any, "nom d'utilisateur", "lol")

console.log(format(new XMLSerializer().serializeToString(xml as any)))