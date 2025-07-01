import { Argon2, Argon2Deriver, Memory } from "@hazae41/argon2.wasm"
import { Cursor } from "@hazae41/cursor"
import { DOMParser, XMLSerializer } from "@xmldom/xmldom"
import { Uint8Array } from "libs/bytes/index.js"
import { readFileSync } from "node:fs"
import { KdfParameters } from "./headers/outer/index.js"
import { AesCbcCryptor, Database, Inner } from "./index.js"

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

const bytes = readFileSync("./local/test.kdbx")

const database = Database.readOrThrow(new Cursor(bytes))

if (database.head.data.value.headers.kdf instanceof KdfParameters.Argon2d === false)
  throw new Error()

const passwordString = "test"
const passwordBytes = new TextEncoder().encode(passwordString)
const passwordHashBuffer = await crypto.subtle.digest("SHA-256", passwordBytes)

const compositeKeyBuffer = await crypto.subtle.digest("SHA-256", passwordHashBuffer)
const compositeKeyBytes = new Uint8Array(compositeKeyBuffer)

const { version, iterations, parallelism, memory, salt } = database.head.data.value.headers.kdf

const deriverPointer = new Argon2Deriver("argon2d", version, Number(memory) / 1024, Number(iterations), parallelism)
const derivedMemoryPointer = deriverPointer.derive(new Memory(compositeKeyBytes), new Memory(salt.get()))

const masterSeedCopiable = database.head.data.value.headers.seed

const preMasterKey = new Uint8Array(masterSeedCopiable.get().length + derivedMemoryPointer.bytes.length)

const preMasterKeyCursor = new Cursor(preMasterKey)
preMasterKeyCursor.writeOrThrow(masterSeedCopiable.get())
preMasterKeyCursor.writeOrThrow(derivedMemoryPointer.bytes)

const masterKeyBuffer = await crypto.subtle.digest("SHA-256", preMasterKey)
const masterKeyBytes = new Uint8Array(masterKeyBuffer)

const preMasterHmacKey = new Uint8Array(masterSeedCopiable.get().length + derivedMemoryPointer.bytes.length + 1)

const preMasterHmacKeyCursor = new Cursor(preMasterHmacKey)
preMasterHmacKeyCursor.writeOrThrow(masterSeedCopiable.get())
preMasterHmacKeyCursor.writeOrThrow(derivedMemoryPointer.bytes)
preMasterHmacKeyCursor.writeUint8OrThrow(1)

const masterHmacKeyBuffer = await crypto.subtle.digest("SHA-512", preMasterHmacKey)
const masterHmacKeyBytes = new Uint8Array(masterHmacKeyBuffer) as Uint8Array<32>

await database.verifyOrThrow(masterHmacKeyBytes)

const cryptor = await AesCbcCryptor.importOrThrow(database, masterKeyBytes)

const decryptedBytes = await database.decryptOrThrow(cryptor)
const dezippedBytes = await unzip(decryptedBytes)

const cursor = new Cursor(dezippedBytes)

const head = Inner.Headers.readOrThrow(cursor)
console.log(head)

const body = cursor.after
const text = new TextDecoder("utf-8").decode(body)
console.log(format(text))

const xml = new DOMParser().parseFromString(text, "text/xml")

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