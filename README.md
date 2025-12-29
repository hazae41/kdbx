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

const encrypted = Readable.readFromBytesOrThrow(Database.Encrypted, readFileSync("./local/input.kdbx")).cloneOrThrow()
const decrypted = await encrypted.decryptOrThrow(password)

const file = decrypted.inner.content.value
const root = file.getRootOrThrow()
const meta = file.getMetaOrThrow()

const group0 = root.getDirectGroupByIndexOrThrow(0)
const subgroup0 = group0.getDirectGroupByIndexOrThrow(0)
const entry0 = subgroup0.getDirectEntryByIndexOrThrow(0)

entry0.cloneToHistoryOrThrow()

entry0.getDirectStringByKeyOrThrow("Title").getValueOrThrow().set("Example")

entry0.getTimesOrThrow().getLastModificationTimeOrThrow().setOrThrow(new Date())
entry0.getTimesOrThrow().getLastAccessTimeOrThrow().setOrThrow(new Date())
entry0.getTimesOrThrow().getUsageCountOrThrow().incrementOrThrow()

const decrypted2 = await decrypted.rotateOrThrow(password)
const encrypted2 = await decrypted2.encryptOrThrow()

writeFileSync("./local/output.kdbx", Writable.writeToBytesOrThrow(encrypted2))
```