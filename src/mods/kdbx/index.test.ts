import { Cursor } from "@hazae41/cursor";
import { readFileSync } from "node:fs";
import { Database } from "./index.js";

const bytes = readFileSync("./local/test.kdbx");

Database.readOrThrow(new Cursor(bytes))