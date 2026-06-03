# KDBX

KeePass (KDBX 4) file format for the web

```bash
npm install @hazae41/kdbx
```

[**📦 NPM**](https://www.npmjs.com/package/@hazae41/kdbx)

## Features

### Current features
- 100% TypeScript and ESM
- No external dependencies
- Rust-like patterns
- Easy read/modify/write
- Uses WebCrypto and WebAssembly

## Usage

```tsx
import { Readable, Writable } from "@hazae41/binary"
import { CompositeKey, Database, PasswordKey } from "@hazae41/kdbx"
import { readFileSync, writeFileSync } from "node:fs"

const password = await CompositeKey.digest(await PasswordKey.digest(new TextEncoder().encode("test")))

const encrypted = Readable.readFromBytes(Database.Encrypted, readFileSync("./local/input.kdbx"))
const decrypted = await encrypted.decrypt(password)

const $file = decrypted.inner.content.value
const $root = file.getRoot()
const $meta = file.getMeta()

const $group0 = $root.getDirectGroupByIndex(0)
const $entry0 = $group0.getDirectEntryByIndex(0)

$entry0.getStringByKey("Title").getValue().set("Example")

const encrypted2 = await decrypted2.encrypt(password)

writeFileSync("./local/output.kdbx", Writable.writeToBytes(encrypted2))
```