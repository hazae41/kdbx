import { Argon2, Argon2Deriver, Memory } from "@hazae41/argon2.wasm";
import { Cursor } from "@hazae41/cursor";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { AesCbcCryptor, Argon2dKdfParameters, Database, InnerHeaders } from "./index.js";

function equals(a: Uint8Array, b: Uint8Array): boolean {
  return Buffer.compare(a, b) === 0;
}

await Argon2.initBundled()

const bytes = readFileSync("./local/test.kdbx");

const database = Database.readOrThrow(new Cursor(bytes))

const headersHashBuffer = await crypto.subtle.digest("SHA-256", database.head.headers.data.bytes.get())
const headersHashBytes = new Uint8Array(headersHashBuffer);

if (!equals(headersHashBytes, database.head.headers.hash.get()))
  throw new Error()

if (database.head.headers.data.value.kdf instanceof Argon2dKdfParameters === false)
  throw new Error()

const passwordString = "test"
const passwordBytes = new TextEncoder().encode(passwordString);
const passwordHashBuffer = await crypto.subtle.digest("SHA-256", passwordBytes);

const compositeKeyBuffer = await crypto.subtle.digest("SHA-256", passwordHashBuffer);
const compositeKeyBytes = new Uint8Array(compositeKeyBuffer)

const { version, iterations, parallelism, memory, salt } = database.head.headers.data.value.kdf

const deriverPointer = new Argon2Deriver("argon2d", version, Number(memory) / 1024, Number(iterations), parallelism);
const derivedMemoryPointer = deriverPointer.derive(new Memory(compositeKeyBytes), new Memory(salt.get()));

const masterSeedCopiable = database.head.headers.data.value.seed

const preMasterKey = new Uint8Array(masterSeedCopiable.get().length + derivedMemoryPointer.bytes.length);
preMasterKey.set(masterSeedCopiable.get());
preMasterKey.set(derivedMemoryPointer.bytes, masterSeedCopiable.get().length);

const masterKeyBuffer = await crypto.subtle.digest("SHA-256", preMasterKey)
const masterKeyBytes = new Uint8Array(masterKeyBuffer);

const cryptor = await AesCbcCryptor.importOrThrow(database, masterKeyBytes)

const decryptedBytes = await database.decryptOrThrow(cryptor)
const dezippedBytes = gunzipSync(decryptedBytes);

const cursor = new Cursor(dezippedBytes);
const head = InnerHeaders.readOrThrow(cursor);
const body = cursor.after

const text = new TextDecoder("utf-8").decode(body);

console.log(`@${text}@`);