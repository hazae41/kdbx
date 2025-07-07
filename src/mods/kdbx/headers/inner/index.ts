import { Opaque, Readable, Writable } from "@hazae41/binary"
import { Cursor } from "@hazae41/cursor"
import { Lengthed } from "@hazae41/lengthed"
import { Nullable } from "libs/nullable/index.js"
import { now } from "libs/time/index.js"
import { Vector } from "mods/kdbx/vector/index.js"
import { Cipher } from "./cipher/index.js"

export class HeadersAndContentWithBytes {

  constructor(
    readonly headers: Headers,
    readonly content: ContentWithBytes
  ) { }

  async rotateOrThrow() {
    return new HeadersAndContentWithBytes(await this.headers.rotateOrThrow(), this.content)
  }

  sizeOrThrow() {
    return this.headers.sizeOrThrow() + this.content.sizeOrThrow()
  }

  writeOrThrow(cursor: Cursor) {
    this.headers.writeOrThrow(cursor)
    this.content.writeOrThrow(cursor)
  }

  computeOrThrow() {
    const headers = this.headers
    const content = this.content.computeOrThrow()

    return new HeadersAndContentWithBytes(headers, content)
  }

}

export class ContentWithBytes {

  constructor(
    readonly bytes: Opaque,
    readonly value: Document
  ) { }

  sizeOrThrow() {
    return this.bytes.sizeOrThrow()
  }

  writeOrThrow(cursor: Cursor) {
    this.bytes.writeOrThrow(cursor)
  }

  computeOrThrow() {
    const raw = new XMLSerializer().serializeToString(this.value)

    const bytes = new TextEncoder().encode(raw) as Uint8Array & { length: number }

    return new ContentWithBytes(new Opaque(bytes), this.value)
  }

  getMetaOrThrow() {
    const element = this.value.querySelector(":scope > Meta")

    if (element == null)
      throw new Error()

    return new Meta(element)
  }

  getRootOrThrow() {
    const element = this.value.querySelector(":scope > Root")

    if (element == null)
      throw new Error()

    return new Root(element)
  }

}

export namespace ContentWithBytes {

  export function readOrThrow(cursor: Cursor) {
    const bytes = new Opaque(cursor.readOrThrow(cursor.remaining))

    const raw = new TextDecoder().decode(bytes.bytes)
    const xml = new DOMParser().parseFromString(raw, "text/xml")

    return new ContentWithBytes(bytes, xml)
  }

}

export namespace HeadersAndContentWithBytes {

  export function readOrThrow(cursor: Cursor) {
    const headers = Headers.readOrThrow(cursor)
    const content = ContentWithBytes.readOrThrow(cursor)

    return new HeadersAndContentWithBytes(headers, content)
  }

}

export interface HeadersInit {
  readonly cipher: Cipher
  readonly key: Opaque<32>
  readonly binary: readonly Opaque[]
}

export class Headers {

  constructor(
    readonly value: Vector<{ 1: readonly [Cipher], 2: readonly [Opaque], 3: readonly Opaque[] }>,
  ) { }

  get cipher() {
    return this.value.value[1][0]
  }

  get key() {
    return this.value.value[2][0]
  }

  get binary() {
    return this.value.value[3]
  }

  sizeOrThrow() {
    return this.value.sizeOrThrow()
  }

  writeOrThrow(cursor: Cursor) {
    this.value.writeOrThrow(cursor)
  }

  cloneOrThrow() {
    return Readable.readFromBytesOrThrow(Headers, Writable.writeToBytesOrThrow(this))
  }

  async rotateOrThrow() {
    const { cipher, binary } = this

    const key = new Opaque(new Uint8Array(crypto.getRandomValues(new Uint8Array(32))) as Uint8Array & Lengthed<32>)

    return Headers.initOrThrow({ cipher, key, binary })
  }

  async getCipherOrThrow() {
    return await this.cipher.initOrThrow(this.key.bytes)
  }

}

export namespace Headers {

  export function initOrThrow(init: HeadersInit) {
    const { cipher, key, binary } = init

    const indexed = {
      1: [cipher],
      2: [key],
      3: binary
    } as const

    return new Headers(Vector.initOrThrow(indexed))
  }

  export function readOrThrow(cursor: Cursor) {
    const vector = Vector.readOrThrow(cursor)

    if (vector.value[1].length !== 1)
      throw new Error()
    const a = [vector.value[1][0].readIntoOrThrow(Cipher)] as const

    if (vector.value[2].length !== 1)
      throw new Error()
    const b = [vector.value[2][0]] as const

    if (vector.value[3].length === 0)
      throw new Error()
    const c = vector.value[3]

    const indexed = { 1: a, 2: b, 3: c }

    return new Headers(new Vector(vector.bytes, indexed))
  }

}

export class Unknown {

  constructor(
    readonly element: Element
  ) { }

  get() {
    return this.element.innerHTML
  }

  set(value: string) {
    this.element.innerHTML = value
  }

}

export class Meta {

  constructor(
    readonly element: Element
  ) { }

  getDatabaseNameOrThrow() {
    const element = this.element.querySelector(":scope > DatabaseName")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

  getDatabaseNameChangedOrThrow() {
    const element = this.element.querySelector(":scope > DatabaseNameChanged")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

  setDatabaseNameWithTimeOrThrow(name: string) {
    const value = this.getDatabaseNameOrThrow()
    const stamp = this.getDatabaseNameChangedOrThrow()

    value.set(name)
    stamp.set(now())
  }

  getGeneratorOrThrow() {
    const element = this.element.querySelector(":scope > Generator")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

  getHistoryMaxItemsOrThrow() {
    const element = this.element.querySelector(":scope > HistoryMaxItems")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

  getHistoryMaxSizeOrThrow() {
    const element = this.element.querySelector(":scope > HistoryMaxSize")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

  getRecycleBinEnabledOrThrow() {
    const element = this.element.querySelector(":scope > RecycleBinEnabled")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

  getRecycleBinUuidOrThrow() {
    const element = this.element.querySelector(":scope > RecycleBinUUID")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

  getRecycleBinChangedOrThrow() {
    const element = this.element.querySelector(":scope > RecycleBinChanged")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

  getSettingsChangedOrThrow() {
    const element = this.element.querySelector(":scope > SettingsChanged")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

  getDatabaseDescriptionOrThrow() {
    const element = this.element.querySelector(":scope > DatabaseDescription")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

  getDatabaseDescriptionChangedOrThrow() {
    const element = this.element.querySelector(":scope > DatabaseDescriptionChanged")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

  setDatabaseDescriptionWithTimeOrThrow(description: string) {
    const value = this.getDatabaseDescriptionOrThrow()
    const stamp = this.getDatabaseDescriptionChangedOrThrow()

    value.set(description)
    stamp.set(now())
  }

  getDefaultUserNameOrThrow() {
    const element = this.element.querySelector(":scope > DefaultUserName")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

  getDefaultUserNameChangedOrThrow() {
    const element = this.element.querySelector(":scope > DefaultUserNameChanged")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

  setDefaultUserNameWithTimeOrThrow(name: string) {
    const value = this.getDefaultUserNameOrThrow()
    const stamp = this.getDefaultUserNameChangedOrThrow()

    value.set(name)
    stamp.set(now())
  }

  getColorOrThrow() {
    const element = this.element.querySelector(":scope > Color")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

  getEntryTemplatesGroupOrThrow() {
    const element = this.element.querySelector(":scope > EntryTemplatesGroup")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

  getEntryTemplatesGroupChangedOrThrow() {
    const element = this.element.querySelector(":scope > EntryTemplatesGroupChanged")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

  setEntryTemplatesGroupWithTimeOrThrow(uuid: string) {
    const value = this.getEntryTemplatesGroupOrThrow()
    const stamp = this.getEntryTemplatesGroupChangedOrThrow()

    value.set(uuid)
    stamp.set(now())
  }

}

export class Root {

  constructor(
    readonly element: Element
  ) { }

  *getGroups() {
    const elements = this.element.querySelectorAll(`:scope > Group`);

    for (const element of elements)
      yield new Group(element)

    return
  }

  getGroupByIndexOrThrow(index: number) {
    const element = this.element.querySelector(`:scope > Group:nth-of-type(${index + 1})`);

    if (element == null)
      throw new Error();

    return new Group(element);
  }

  getGroupByIndexOrNull(index: number) {
    const element = this.element.querySelector(`:scope > Group:nth-of-type(${index + 1})`);

    if (element == null)
      return

    return new Group(element)
  }

  getGroupByUuidOrThrow(uuid: string) {
    const elements = this.element.querySelectorAll(`:scope > Group`);

    for (const element of elements) {
      const group = new Group(element);

      if (group.getUuidOrThrow().get() === uuid)
        return group;

      continue
    }

    throw new Error();
  }

  getGroupByUuidOrNull(uuid: string) {
    const elements = this.element.querySelectorAll(`:scope > Group`);

    for (const element of elements) {
      const group = new Group(element);

      if (group.getUuidOrThrow().get() === uuid)
        return group;

      continue
    }

    return
  }

}

export class Group {

  constructor(
    readonly element: Element
  ) { }

  getNameOrThrow() {
    const element = this.element.querySelector(":scope > Name")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

  getUuidOrThrow() {
    const element = this.element.querySelector(":scope > UUID")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

  getTimesOrThrow() {
    const element = this.element.querySelector(":scope > Times")

    if (element == null)
      throw new Error()

    return new Times(element)
  }

  getIconIdOrThrow() {
    const element = this.element.querySelector(":scope > IconID")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

  getEnableAutoTypeOrThrow() {
    const element = this.element.querySelector(":scope > EnableAutoType")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

  getEnableSearchingOrThrow() {
    const element = this.element.querySelector(":scope > EnableSearching")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

  *getGroups() {
    const elements = this.element.querySelectorAll(`:scope > Group`);

    for (const element of elements)
      yield new Group(element)

    return
  }

  getGroupByIndexOrThrow(index: number) {
    const element = this.element.querySelector(`:scope > Group:nth-of-type(${index + 1})`);

    if (element == null)
      throw new Error();

    return new Group(element);
  }

  getGroupByIndexOrNull(index: number) {
    const element = this.element.querySelector(`:scope > Group:nth-of-type(${index + 1})`);

    if (element == null)
      return

    return new Group(element)
  }

  getGroupByUuidOrThrow(uuid: string) {
    const elements = this.element.querySelectorAll(`:scope > Group`);

    for (const element of elements) {
      const group = new Group(element);

      if (group.getUuidOrThrow().get() === uuid)
        return group;

      continue
    }

    throw new Error();
  }

  getGroupByUuidOrNull(uuid: string) {
    const elements = this.element.querySelectorAll(`:scope > Group`);

    for (const element of elements) {
      const group = new Group(element);

      if (group.getUuidOrThrow().get() === uuid)
        return group;

      continue
    }

    return
  }

  *getEntries() {
    const elements = this.element.querySelectorAll(`:scope > Entry`);

    for (const element of elements)
      yield new Entry(element)

    return
  }

  getEntryByIndexOrThrow(index: number) {
    const element = this.element.querySelector(`:scope > Entry:nth-of-type(${index + 1})`);

    if (element == null)
      throw new Error();

    return new Entry(element);
  }

  getEntryByIndexOrNull(index: number) {
    const element = this.element.querySelector(`:scope > Entry:nth-of-type(${index + 1})`);

    if (element == null)
      return

    return new Entry(element)
  }

  getEntryByUuidOrThrow(uuid: string) {
    const elements = this.element.querySelectorAll(`:scope > Entry`);

    for (const element of elements) {
      const entry = new Entry(element);

      if (entry.getUuidOrThrow().get() === uuid)
        return entry;

      continue
    }

    throw new Error();
  }

  getEntryByUuidOrNull(uuid: string) {
    const elements = this.element.querySelectorAll(`:scope > Entry`);

    for (const element of elements) {
      const entry = new Entry(element);

      if (entry.getUuidOrThrow().get() === uuid)
        return entry;

      continue
    }

    return
  }

}

export class Times {

  constructor(
    readonly element: Element
  ) { }

  getLastModificationTimeOrThrow() {
    const element = this.element.querySelector(":scope > LastModificationTime")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

  getCreationTimeOrThrow() {
    const element = this.element.querySelector(":scope > CreationTime")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

  getLastAccessTimeOrThrow() {
    const element = this.element.querySelector(":scope > LastAccessTime")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

  getExpiresOrThrow() {
    const element = this.element.querySelector(":scope > Expires")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

  getUsageCountOrThrow() {
    const element = this.element.querySelector(":scope > UsageCount")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

  getLocationChangedOrThrow() {
    const element = this.element.querySelector(":scope > LocationChanged")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

}

export class Entry {

  constructor(
    readonly element: Element
  ) { }

  getUuidOrThrow() {
    const element = this.element.querySelector(":scope > UUID")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

  getTimesOrThrow() {
    const element = this.element.querySelector(":scope > Times")

    if (element == null)
      throw new Error()

    return new Times(element)
  }

  getHistoryOrThrow() {
    const element = this.element.querySelector(":scope > History")

    if (element == null)
      throw new Error()

    return new History(element)
  }

  getHistoryOrNull() {
    const element = this.element.querySelector(":scope > History")

    if (element == null)
      return

    return new History(element)
  }

  getHistoryOrNew() {
    const { ownerDocument } = this.element

    const element = this.element.querySelector(":scope > History")

    if (element != null)
      return new History(element)

    const created = ownerDocument.createElement("History");

    this.element.appendChild(created);

    return new History(created);
  }

  isInHistory() {
    return this.element.parentElement?.nodeName === "History"
  }

  cloneToHistory() {
    const clone = new Entry(this.element.cloneNode(true) as Element)

    const history = clone.getHistoryOrNull()

    if (history != null)
      clone.element.removeChild(history.element)

    this.getHistoryOrNew().element.prepend(clone.element)

    return clone
  }

  *getStrings() {
    const elements = this.element.querySelectorAll(`:scope > String`);

    for (const element of elements)
      yield new String(element)

    return
  }

  getStringByIndexOrThrow(index: number) {
    const element = this.element.querySelector(`:scope > String:nth-of-type(${index + 1})`);

    if (element == null)
      throw new Error();

    return new String(element);
  }

  getStringByIndexOrNull(index: number) {
    const element = this.element.querySelector(`:scope > String:nth-of-type(${index + 1})`);

    if (element == null)
      return

    return new String(element)
  }

  getStringByKeyOrThrow(key: string) {
    const elements = this.element.querySelectorAll(`:scope > String`);

    for (const element of elements) {
      const string = new String(element);

      if (string.getKeyOrThrow().get() === key)
        return string;

      continue
    }

    throw new Error();
  }

  getStringByKeyOrNull(key: string) {
    const elements = this.element.querySelectorAll(`:scope > String`);

    for (const element of elements) {
      const string = new String(element);

      if (string.getKeyOrThrow().get() === key)
        return string;

      continue
    }

    return
  }

}

export class String {

  constructor(
    readonly element: Element
  ) { }

  getKeyOrThrow() {
    const element = this.element.querySelector(":scope > Key")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

  getValueOrThrow() {
    const element = this.element.querySelector(":scope > Value")

    if (element == null)
      throw new Error()

    return new Unknown(element)
  }

}

export class Value {

  constructor(
    readonly element: Element
  ) { }

  get() {
    return this.element.innerHTML
  }

  set(value: string) {
    this.element.innerHTML = value
  }

  get protected() {
    return this.element.getAttribute("Protected")
  }

  set protected(value: Nullable<string>) {
    if (value == null)
      this.element.removeAttribute("Protected")
    else
      this.element.setAttribute("Protected", value)
  }

}

export class History {

  constructor(
    readonly element: Element
  ) { }

  *getEntries() {
    const elements = this.element.querySelectorAll(`:scope > Entry`);

    for (const element of elements)
      yield new Entry(element)

    return
  }

  getEntryByIndexOrThrow(index: number) {
    const element = this.element.querySelector(`:scope > Entry:nth-of-type(${index + 1})`);

    if (element == null)
      throw new Error();

    return new Entry(element);
  }

  getEntryByIndexOrNull(index: number) {
    const element = this.element.querySelector(`:scope > Entry:nth-of-type(${index + 1})`);

    if (element == null)
      return

    return new Entry(element)
  }

}