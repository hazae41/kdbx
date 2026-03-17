# KDBX

Rust-like KeePass (KDBX 4) file format for TypeScript

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

const password = await CompositeKey.digestOrThrow(await PasswordKey.digestOrThrow(new TextEncoder().encode("test")))

const encrypted = Readable.readFromBytesOrThrow(Database.Encrypted, readFileSync("./local/input.kdbx"))
const decrypted = await encrypted.decryptOrThrow(password)

const $file = decrypted.inner.content.value
const $root = file.getRootOrThrow()
const $meta = file.getMetaOrThrow()

const $group0 = $root.getDirectGroupByIndexOrThrow(0)
const $entry0 = $group0.getDirectEntryByIndexOrThrow(0)

$entry0.getStringByKeyOrThrow("Title").getValueOrThrow().set("Example")

const encrypted2 = await decrypted2.encryptOrThrow(password)

writeFileSync("./local/output.kdbx", Writable.writeToBytesOrThrow(encrypted2))
```