import { Base64 } from "@hazae41/base64"
import { Opaque, Readable, Writable } from "@hazae41/binary"
import { Cursor } from "@hazae41/cursor"
import { Lengthed } from "@hazae41/lengthed"
import { Nullable } from "libs/nullable/index.js"
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

  getKeePassFile() {
    return new KeePassFile(this.value)
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
    if (vector.value[2].length !== 1)
      throw new Error()
    if (vector.value[3].length === 0)
      throw new Error()

    const indexed = {
      1: [vector.value[1][0].readIntoOrThrow(Cipher)],
      2: [vector.value[2][0]],
      3: vector.value[3]
    } as const

    return new Headers(new Vector(vector.bytes, indexed))
  }

}

export namespace Html {


  export class AsString {

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

  export class AsBoolean {

    constructor(
      readonly element: Element
    ) { }

    get() {
      return this.element.innerHTML === "True"
    }

    set(value: boolean) {
      this.element.innerHTML = value ? "True" : "False"
    }

  }

  export class AsNumber {

    constructor(
      readonly element: Element
    ) { }

    get() {
      const value = this.element.innerHTML

      if (!value)
        return NaN

      return Number(value)
    }

    set(value: number) {
      this.element.innerHTML = String(value)
    }

  }

  export class AsDate {

    constructor(
      readonly element: Element
    ) { }

    get() {
      const value = this.element.innerHTML

      if (!value)
        return new Date(0)

      const memory = Base64.get().getOrThrow().decodePaddedOrThrow(value)
      const cursor = new Cursor(memory.bytes)

      const raw = cursor.readUint64OrThrow(true)
      const fix = raw - 62135596800n

      return new Date(Number(fix * 1000n))
    }

    set(value: Date) {
      const fix = BigInt(value.getTime()) / 1000n
      const raw = fix + 62135596800n

      const cursor = new Cursor(new Uint8Array(8))
      cursor.writeUint64OrThrow(raw, true)

      this.element.innerHTML = Base64.get().getOrThrow().encodePaddedOrThrow(cursor.bytes)
    }
  }

}

export class KeePassFile {

  constructor(
    readonly document: Document
  ) { }

  getMetaOrThrow() {
    const element = this.document.querySelector(":scope > Meta")

    if (element == null)
      throw new Error()

    return new KeePassFile.Meta(element)
  }

  getRootOrThrow() {
    const element = this.document.querySelector(":scope > Root")

    if (element == null)
      throw new Error()

    return new KeePassFile.Root(element)
  }

}

export namespace KeePassFile {

  export class Meta {

    constructor(
      readonly element: Element
    ) { }

    getDatabaseNameOrThrow() {
      const element = this.element.querySelector(":scope > DatabaseName")

      if (element == null)
        throw new Error()

      return new Html.AsString(element)
    }

    getDatabaseNameChangedOrThrow() {
      const element = this.element.querySelector(":scope > DatabaseNameChanged")

      if (element == null)
        throw new Error()

      return new Html.AsDate(element)
    }

    getGeneratorOrThrow() {
      const element = this.element.querySelector(":scope > Generator")

      if (element == null)
        throw new Error()

      return new Html.AsString(element)
    }

    getHistoryMaxItemsOrThrow() {
      const element = this.element.querySelector(":scope > HistoryMaxItems")

      if (element == null)
        throw new Error()

      return new Html.AsNumber(element)
    }

    getHistoryMaxSizeOrThrow() {
      const element = this.element.querySelector(":scope > HistoryMaxSize")

      if (element == null)
        throw new Error()

      return new Html.AsNumber(element)
    }

    getRecycleBinEnabledOrThrow() {
      const element = this.element.querySelector(":scope > RecycleBinEnabled")

      if (element == null)
        throw new Error()

      return new Html.AsBoolean(element)
    }

    getRecycleBinUuidOrThrow() {
      const element = this.element.querySelector(":scope > RecycleBinUUID")

      if (element == null)
        throw new Error()

      return new Html.AsString(element)
    }

    getRecycleBinChangedOrThrow() {
      const element = this.element.querySelector(":scope > RecycleBinChanged")

      if (element == null)
        throw new Error()

      return new Html.AsDate(element)
    }

    getSettingsChangedOrThrow() {
      const element = this.element.querySelector(":scope > SettingsChanged")

      if (element == null)
        throw new Error()

      return new Html.AsDate(element)
    }

    getDatabaseDescriptionOrThrow() {
      const element = this.element.querySelector(":scope > DatabaseDescription")

      if (element == null)
        throw new Error()

      return new Html.AsString(element)
    }

    getDatabaseDescriptionChangedOrThrow() {
      const element = this.element.querySelector(":scope > DatabaseDescriptionChanged")

      if (element == null)
        throw new Error()

      return new Html.AsDate(element)
    }

    getDefaultUserNameOrThrow() {
      const element = this.element.querySelector(":scope > DefaultUserName")

      if (element == null)
        throw new Error()

      return new Html.AsString(element)
    }

    getDefaultUserNameChangedOrThrow() {
      const element = this.element.querySelector(":scope > DefaultUserNameChanged")

      if (element == null)
        throw new Error()

      return new Html.AsDate(element)
    }

    getColorOrThrow() {
      const element = this.element.querySelector(":scope > Color")

      if (element == null)
        throw new Error()

      return new Html.AsString(element)
    }

    getDirectEntryTemplatesGroupOrThrow() {
      const element = this.element.querySelector(":scope > EntryTemplatesGroup")

      if (element == null)
        throw new Error()

      return new Html.AsString(element)
    }

    getDirectEntryTemplatesGroupChangedOrThrow() {
      const element = this.element.querySelector(":scope > EntryTemplatesGroupChanged")

      if (element == null)
        throw new Error()

      return new Html.AsDate(element)
    }

  }

  export class Root {

    constructor(
      readonly element: Element
    ) { }

    *getGroups() {
      const elements = this.element.querySelectorAll(`Group`);

      for (const element of elements)
        yield new Group(element)

      return
    }

    getGroupByUuidOrThrow(uuid: string) {
      const elements = this.element.querySelectorAll(`Group`);

      for (const element of elements) {
        const group = new Group(element);

        if (group.getUuidOrThrow().get() === uuid)
          return group;

        continue
      }

      throw new Error()
    }

    getGroupByUuidOrNull(uuid: string) {
      const elements = this.element.querySelectorAll(`Group`);

      for (const element of elements) {
        const group = new Group(element);

        if (group.getUuidOrThrow().get() === uuid)
          return group;

        continue
      }

      return
    }

    *getDirectGroups() {
      const elements = this.element.querySelectorAll(`:scope > Group`);

      for (const element of elements)
        yield new Group(element)

      return
    }

    getDirectGroupByIndexOrThrow(index: number) {
      const element = this.element.querySelector(`:scope > Group:nth-of-type(${index + 1})`);

      if (element == null)
        throw new Error();

      return new Group(element);
    }

    getDirectGroupByIndexOrNull(index: number) {
      const element = this.element.querySelector(`:scope > Group:nth-of-type(${index + 1})`);

      if (element == null)
        return

      return new Group(element)
    }

    getDirectGroupByUuidOrThrow(uuid: string) {
      const elements = this.element.querySelectorAll(`:scope > Group`);

      for (const element of elements) {
        const group = new Group(element);

        if (group.getUuidOrThrow().get() === uuid)
          return group;

        continue
      }

      throw new Error();
    }

    getDirectGroupByUuidOrNull(uuid: string) {
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

    moveOrThrow(group: Group) {
      if (this.element.parentNode === group.element)
        return

      this.element.parentNode?.removeChild(this.element)

      group.element.appendChild(this.element)

      this.getTimesOrThrow().getLocationChangedOrThrow().set(new Date())

      group.getTimesOrThrow().getLastModificationTimeOrThrow().set(new Date())
    }

    getNameOrThrow() {
      const element = this.element.querySelector(":scope > Name")

      if (element == null)
        throw new Error()

      return new Html.AsString(element)
    }

    getUuidOrThrow() {
      const element = this.element.querySelector(":scope > UUID")

      if (element == null)
        throw new Error()

      return new Html.AsString(element)
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

      return new Html.AsNumber(element)
    }

    getEnableAutoTypeOrThrow() {
      const element = this.element.querySelector(":scope > EnableAutoType")

      if (element == null)
        throw new Error()

      return new Html.AsBoolean(element)
    }

    getEnableSearchingOrThrow() {
      const element = this.element.querySelector(":scope > EnableSearching")

      if (element == null)
        throw new Error()

      return new Html.AsBoolean(element)
    }

    *getDirectGroups() {
      const elements = this.element.querySelectorAll(`:scope > Group`);

      for (const element of elements)
        yield new Group(element)

      return
    }

    getDirectGroupByIndexOrThrow(index: number) {
      const element = this.element.querySelector(`:scope > Group:nth-of-type(${index + 1})`);

      if (element == null)
        throw new Error();

      return new Group(element);
    }

    getDirectGroupByIndexOrNull(index: number) {
      const element = this.element.querySelector(`:scope > Group:nth-of-type(${index + 1})`);

      if (element == null)
        return

      return new Group(element)
    }

    getDirectGroupByUuidOrThrow(uuid: string) {
      const elements = this.element.querySelectorAll(`:scope > Group`);

      for (const element of elements) {
        const group = new Group(element);

        if (group.getUuidOrThrow().get() === uuid)
          return group;

        continue
      }

      throw new Error();
    }

    getDirectGroupByUuidOrNull(uuid: string) {
      const elements = this.element.querySelectorAll(`:scope > Group`);

      for (const element of elements) {
        const group = new Group(element);

        if (group.getUuidOrThrow().get() === uuid)
          return group;

        continue
      }

      return
    }

    *getDirectEntries() {
      const elements = this.element.querySelectorAll(`:scope > Entry`);

      for (const element of elements)
        yield new Entry(element)

      return
    }

    getDirectEntryByIndexOrThrow(index: number) {
      const element = this.element.querySelector(`:scope > Entry:nth-of-type(${index + 1})`);

      if (element == null)
        throw new Error();

      return new Entry(element);
    }

    getDirectEntryByIndexOrNull(index: number) {
      const element = this.element.querySelector(`:scope > Entry:nth-of-type(${index + 1})`);

      if (element == null)
        return

      return new Entry(element)
    }

    getDirectEntryByUuidOrThrow(uuid: string) {
      const elements = this.element.querySelectorAll(`:scope > Entry`);

      for (const element of elements) {
        const entry = new Entry(element);

        if (entry.getUuidOrThrow().get() === uuid)
          return entry;

        continue
      }

      throw new Error();
    }

    getDirectEntryByUuidOrNull(uuid: string) {
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

      return new Html.AsDate(element)
    }

    getCreationTimeOrThrow() {
      const element = this.element.querySelector(":scope > CreationTime")

      if (element == null)
        throw new Error()

      return new Html.AsDate(element)
    }

    getLastAccessTimeOrThrow() {
      const element = this.element.querySelector(":scope > LastAccessTime")

      if (element == null)
        throw new Error()

      return new Html.AsDate(element)
    }

    getExpiresOrThrow() {
      const element = this.element.querySelector(":scope > Expires")

      if (element == null)
        throw new Error()

      return new Html.AsBoolean(element)
    }

    getUsageCountOrThrow() {
      const element = this.element.querySelector(":scope > UsageCount")

      if (element == null)
        throw new Error()

      return new Html.AsNumber(element)
    }

    getLocationChangedOrThrow() {
      const element = this.element.querySelector(":scope > LocationChanged")

      if (element == null)
        throw new Error()

      return new Html.AsDate(element)
    }

  }

  export class Entry {

    constructor(
      readonly element: Element
    ) { }

    moveOrThrow(group: Group) {
      if (this.element.parentNode === group.element)
        return

      this.element.parentNode?.removeChild(this.element)

      group.element.appendChild(this.element)

      this.getTimesOrThrow().getLocationChangedOrThrow().set(new Date())

      group.getTimesOrThrow().getLastModificationTimeOrThrow().set(new Date())
    }

    moveToTrashOrThrow() {
      const file = new KeePassFile(this.element.ownerDocument)
      const meta = file.getMetaOrThrow()
      const root = file.getRootOrThrow()

      const recybleBinEnabled = meta.getRecycleBinEnabledOrThrow().get()

      if (!recybleBinEnabled)
        throw new Error("Recycle bin is not enabled")

      const recycleBinUuid = meta.getRecycleBinUuidOrThrow().get()
      const recycleBinGroup = root.getGroupByUuidOrThrow(recycleBinUuid)

      this.moveOrThrow(recycleBinGroup)

      meta.getRecycleBinChangedOrThrow().set(new Date())
    }

    cloneToHistoryOrThrow() {
      return this.getHistoryOrNew().insertAndCleanOrThrow(this)
    }

    createStringOrThrow(key: string, value: string) {
      const { ownerDocument } = this.element

      const $string = ownerDocument.createElement("String");
      this.element.appendChild($string);

      const $key = ownerDocument.createElement("Key");
      $key.innerHTML = key;
      $string.appendChild($key);

      const $value = ownerDocument.createElement("Value");
      $value.innerHTML = value;
      $string.appendChild($value);

      this.getTimesOrThrow().getLastModificationTimeOrThrow().set(new Date())

      return new String($string)
    }

    getUuidOrThrow() {
      const element = this.element.querySelector(":scope > UUID")

      if (element == null)
        throw new Error()

      return new Html.AsString(element)
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

      const previous = this.element.querySelector(":scope > History")

      if (previous != null)
        return new History(previous)

      const created = ownerDocument.createElement("History");

      this.element.appendChild(created);

      return new History(created);
    }

    *getDirectStrings() {
      const elements = this.element.querySelectorAll(`:scope > String`);

      for (const element of elements)
        yield new String(element)

      return
    }

    getDirectStringByIndexOrThrow(index: number) {
      const element = this.element.querySelector(`:scope > String:nth-of-type(${index + 1})`);

      if (element == null)
        throw new Error();

      return new String(element);
    }

    getDirectStringByIndexOrNull(index: number) {
      const element = this.element.querySelector(`:scope > String:nth-of-type(${index + 1})`);

      if (element == null)
        return

      return new String(element)
    }

    getDirectStringByKeyOrThrow(key: string) {
      const elements = this.element.querySelectorAll(`:scope > String`);

      for (const element of elements) {
        const string = new String(element);

        if (string.getKeyOrThrow().get() === key)
          return string;

        continue
      }

      throw new Error();
    }

    getDirectStringByKeyOrNull(key: string) {
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

      return new Html.AsString(element)
    }

    getValueOrThrow() {
      const element = this.element.querySelector(":scope > Value")

      if (element == null)
        throw new Error()

      return new Html.AsString(element)
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

    insertAndCleanOrThrow(entry: Entry) {
      const clone = new Entry(entry.element.cloneNode(true) as Element)

      const history = clone.getHistoryOrNull()

      if (history != null)
        clone.element.removeChild(history.element)

      this.element.prepend(clone.element)

      this.cleanOrThrow()

      return clone
    }

    cleanOrThrow() {
      const file = new KeePassFile(this.element.ownerDocument)
      const meta = file.getMetaOrThrow()

      const historyMaxItems = meta.getHistoryMaxItemsOrThrow().get()

      if (this.element.children.length > historyMaxItems) {
        while (this.element.children.length > historyMaxItems) {
          const last = this.element.lastElementChild;

          if (last == null)
            throw new Error();

          this.element.removeChild(last);
        }
      }

      const historyMaxSize = meta.getHistoryMaxSizeOrThrow().get()

      for (let bytes = new TextEncoder().encode(new XMLSerializer().serializeToString(this.element)); bytes.length > historyMaxSize; bytes = new TextEncoder().encode(new XMLSerializer().serializeToString(this.element))) {
        const last = this.element.lastElementChild;

        if (last == null)
          throw new Error();

        this.element.removeChild(last);
      }
    }

    *getDirectEntries() {
      const elements = this.element.querySelectorAll(`:scope > Entry`);

      for (const element of elements)
        yield new Entry(element)

      return
    }

    getDirectEntryByIndexOrThrow(index: number) {
      const element = this.element.querySelector(`:scope > Entry:nth-of-type(${index + 1})`);

      if (element == null)
        throw new Error();

      return new Entry(element);
    }

    getDirectEntryByIndexOrNull(index: number) {
      const element = this.element.querySelector(`:scope > Entry:nth-of-type(${index + 1})`);

      if (element == null)
        return

      return new Entry(element)
    }

  }
}