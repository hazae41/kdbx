import { Opaque, Readable, Writable } from "@hazae41/binary"
import { Cursor } from "@hazae41/cursor"
import { now } from "libs/time/index.js"
import { Vector } from "mods/kdbx/vector/index.js"
import { Cipher } from "./cipher/index.js"

export class HeadersAndContentWithBytes {

  constructor(
    readonly headers: Headers,
    readonly content: ContentWithBytes
  ) { }

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

  async getCipherOrThrow() {
    return await this.cipher.initOrThrow(this.key.bytes)
  }

}

export namespace Headers {

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

  getGroupByIndexOrThrow(index: number) {
    const element = this.element.querySelector(`:scope > Group:nth-of-type(${index + 1})`);

    if (element == null)
      throw new Error();

    return new Unknown(element);
  }

  getGroupByIndexOrNull(index: number) {
    const element = this.element.querySelector(`:scope > Group:nth-of-type(${index + 1})`);

    if (element == null)
      return

    return new Unknown(element)
  }

}