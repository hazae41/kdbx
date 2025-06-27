import { Argon2, Argon2Deriver } from "@hazae41/argon2.wasm";
import { Cursor } from "@hazae41/cursor";
import { readFileSync } from "node:fs";
import { Database } from "./index.js";

await Argon2.initBundled()

const bytes = readFileSync("./local/test.kdbx");

const database = Database.readOrThrow(new Cursor(bytes))

const passwordString = "test"
const passwordBytes = new TextEncoder().encode(passwordString);
const passwordHashBytes = await crypto.subtle.digest("SHA-256", passwordBytes);

const compositeKeyBytes = await crypto.subtle.digest("SHA-256", passwordHashBytes);



using deriver = new Argon2Deriver("argon2d",