import { Argon2, Argon2Deriver, Memory } from "@hazae41/argon2.wasm";
import { Cursor } from "@hazae41/cursor";
import { readFileSync } from "node:fs";
import { Argon2dKdfParameters, Database } from "./index.js";

await Argon2.initBundled()

const bytes = readFileSync("./local/test.kdbx");

const database = Database.readOrThrow(new Cursor(bytes))

if (database.headers.kdf instanceof Argon2dKdfParameters === false)
  throw new Error()

const passwordString = "test"
const passwordBytes = new TextEncoder().encode(passwordString);
const passwordHashBuffer = await crypto.subtle.digest("SHA-256", passwordBytes);

const compositeKeyBuffer = await crypto.subtle.digest("SHA-256", passwordHashBuffer);
const compositeKeyBytes = new Uint8Array(compositeKeyBuffer)

const { version, iterations, parallelism, memory, salt } = database.headers.kdf

const deriverPointer = new Argon2Deriver("argon2d", version, Number(memory) / 1024, Number(iterations), parallelism);
const derivedMemoryPointer = deriverPointer.derive(new Memory(compositeKeyBytes), new Memory(salt.get()));

const masterSeedCopiable = database.headers.seed

const preMasterKey = new Uint8Array(masterSeedCopiable.get().length + derivedMemoryPointer.bytes.length);
preMasterKey.set(masterSeedCopiable.get());
preMasterKey.set(derivedMemoryPointer.bytes, masterSeedCopiable.get().length);

const masterKeyBuffer = await crypto.subtle.digest("SHA-256", preMasterKey)
const masterKeyBytes = new Uint8Array(masterKeyBuffer);

const decryptionKey = await crypto.subtle.importKey("raw", masterKeyBytes, { name: "AES-CBC" }, false, ["decrypt"])
const decryptionAlgorithm = { name: "AES-CBC", iv: database.headers.iv.get() }

const decryptedBuffer = await crypto.subtle.decrypt(decryptionAlgorithm, decryptionKey, database.data.get());
const decryptedBytes = new Uint8Array(decryptedBuffer);

console.log(decryptedBytes);