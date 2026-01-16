// deno-lint-ignore-file no-namespace

/// <reference types="./lib.d.ts" />

import type { Nullable } from "@/libs/nullable/mod.ts"
import { BytesAsUuid, StringAsUuid } from "@/libs/uuid/mod.ts"
import { Cursor } from "@hazae41/cursor"

export class KeePassFile {

  constructor(
    readonly document: Document
  ) { }

  createGroupOrThrow(name: string): KeePassFile.Group {
    const $group = new KeePassFile.Group(this.document.createElement("Group"))

    const $name = this.createNameOrThrow(name)
    const $uuid = this.createUuidOrThrow()
    const $times = this.createTimesOrThrow()

    $group.element.appendChild($name.element)
    $group.element.appendChild($uuid.element)
    $group.element.appendChild($times.element)

    return $group
  }

  createEntryOrThrow(): KeePassFile.Entry {
    const $entry = new KeePassFile.Entry(this.document.createElement("Entry"))

    const $uuid = this.createUuidOrThrow()
    const $times = this.createTimesOrThrow()

    $entry.element.appendChild($uuid.element)
    $entry.element.appendChild($times.element)

    return $entry
  }

  createNameOrThrow(name: string): KeePassFile.Other.AsString {
    const $name = new KeePassFile.Other.AsString(this.document.createElement("Name"))

    $name.set(name)

    return $name
  }

  createUuidOrThrow(): KeePassFile.Other.AsUuid {
    const $uuid = new KeePassFile.Other.AsUuid(this.document.createElement("UUID"))

    $uuid.setOrThrow(crypto.randomUUID())

    return $uuid
  }

  createTimesOrThrow(): KeePassFile.Times {
    const $times = new KeePassFile.Times(this.document.createElement("Times"))

    const $lastModificationTime = new KeePassFile.Other.AsDate(this.document.createElement("LastModificationTime"))
    const $creationTime = new KeePassFile.Other.AsDate(this.document.createElement("CreationTime"))
    const $lastAccessTime = new KeePassFile.Other.AsDate(this.document.createElement("LastAccessTime"))
    const $expires = new KeePassFile.Other.AsBoolean(this.document.createElement("Expires"))
    const $usageCount = new KeePassFile.Other.AsInteger(this.document.createElement("UsageCount"))
    const $locationChanged = new KeePassFile.Other.AsDate(this.document.createElement("LocationChanged"))

    $lastModificationTime.setOrThrow(new Date())
    $creationTime.setOrThrow(new Date())
    $lastAccessTime.setOrThrow(new Date())
    $expires.set(false)
    $usageCount.setOrThrow(0)
    $locationChanged.setOrThrow(new Date())

    $times.element.appendChild($creationTime.element)
    $times.element.appendChild($lastAccessTime.element)
    $times.element.appendChild($expires.element)
    $times.element.appendChild($usageCount.element)
    $times.element.appendChild($locationChanged.element)
    $times.element.appendChild($lastModificationTime.element)

    return $times
  }

  createStringOrThrow(key: string, value: string, protect = false): KeePassFile.String {
    const $string = new KeePassFile.String(this.document.createElement("String"))

    const $key = new KeePassFile.Other.AsString(this.document.createElement("Key"))
    const $value = new KeePassFile.Value(this.document.createElement("Value"))

    $key.set(key)
    $value.set(value)

    $value.protected = protect

    $string.element.appendChild($key.element)
    $string.element.appendChild($value.element)

    return $string
  }

  getMetaOrThrow(): KeePassFile.Meta {
    const element = this.document.querySelector(":scope > Meta")

    if (element == null)
      throw new Error()

    return new KeePassFile.Meta(element)
  }

  getRootOrThrow(): KeePassFile.Root {
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

    getDatabaseNameOrThrow(): Other.AsString {
      const element = this.element.querySelector(":scope > DatabaseName")

      if (element == null)
        throw new Error()

      return new Other.AsString(element)
    }

    getDatabaseNameChangedOrThrow(): Other.AsDate {
      const element = this.element.querySelector(":scope > DatabaseNameChanged")

      if (element == null)
        throw new Error()

      return new Other.AsDate(element)
    }

    getGeneratorOrThrow(): Other.AsString {
      const element = this.element.querySelector(":scope > Generator")

      if (element == null)
        throw new Error()

      return new Other.AsString(element)
    }

    getHistoryMaxItemsOrThrow(): Other.AsInteger {
      const element = this.element.querySelector(":scope > HistoryMaxItems")

      if (element == null)
        throw new Error()

      return new Other.AsInteger(element)
    }

    getHistoryMaxSizeOrThrow(): Other.AsInteger {
      const element = this.element.querySelector(":scope > HistoryMaxSize")

      if (element == null)
        throw new Error()

      return new Other.AsInteger(element)
    }

    getRecycleBinEnabledOrThrow(): Other.AsBoolean {
      const element = this.element.querySelector(":scope > RecycleBinEnabled")

      if (element == null)
        throw new Error()

      return new Other.AsBoolean(element)
    }

    getRecycleBinUuidOrThrow(): Other.AsString {
      const element = this.element.querySelector(":scope > RecycleBinUUID")

      if (element == null)
        throw new Error()

      return new Other.AsString(element)
    }

    getRecycleBinChangedOrThrow(): Other.AsDate {
      const element = this.element.querySelector(":scope > RecycleBinChanged")

      if (element == null)
        throw new Error()

      return new Other.AsDate(element)
    }

    getSettingsChangedOrThrow(): Other.AsDate {
      const element = this.element.querySelector(":scope > SettingsChanged")

      if (element == null)
        throw new Error()

      return new Other.AsDate(element)
    }

    getDatabaseDescriptionOrThrow(): Other.AsString {
      const element = this.element.querySelector(":scope > DatabaseDescription")

      if (element == null)
        throw new Error()

      return new Other.AsString(element)
    }

    getDatabaseDescriptionChangedOrThrow(): Other.AsDate {
      const element = this.element.querySelector(":scope > DatabaseDescriptionChanged")

      if (element == null)
        throw new Error()

      return new Other.AsDate(element)
    }

    getDefaultUserNameOrThrow(): Other.AsString {
      const element = this.element.querySelector(":scope > DefaultUserName")

      if (element == null)
        throw new Error()

      return new Other.AsString(element)
    }

    getDefaultUserNameChangedOrThrow(): Other.AsDate {
      const element = this.element.querySelector(":scope > DefaultUserNameChanged")

      if (element == null)
        throw new Error()

      return new Other.AsDate(element)
    }

    getColorOrThrow(): Other.AsString {
      const element = this.element.querySelector(":scope > Color")

      if (element == null)
        throw new Error()

      return new Other.AsString(element)
    }

    getDirectEntryTemplatesGroupOrThrow(): Other.AsString {
      const element = this.element.querySelector(":scope > EntryTemplatesGroup")

      if (element == null)
        throw new Error()

      return new Other.AsString(element)
    }

    getDirectEntryTemplatesGroupChangedOrThrow(): Other.AsDate {
      const element = this.element.querySelector(":scope > EntryTemplatesGroupChanged")

      if (element == null)
        throw new Error()

      return new Other.AsDate(element)
    }

  }

  export class Root {

    constructor(
      readonly element: Element
    ) { }

    *getGroups(): Generator<Group> {
      const elements = this.element.querySelectorAll(`Group`)

      for (const element of elements)
        yield new Group(element)

      return
    }

    getGroupByUuidOrThrow(uuid: string): Group {
      const elements = this.element.querySelectorAll(`Group`)

      for (const element of elements) {
        const group = new Group(element)

        if (group.getUuidOrThrow().getOrThrow() === uuid)
          return group

        continue
      }

      throw new Error()
    }

    getGroupByUuidOrNull(uuid: string): Nullable<Group> {
      const elements = this.element.querySelectorAll(`Group`)

      for (const element of elements) {
        const group = new Group(element)

        if (group.getUuidOrThrow().getOrThrow() === uuid)
          return group

        continue
      }

      return
    }

    *getDirectGroups(): Generator<Group> {
      const elements = this.element.querySelectorAll(`:scope > Group`)

      for (const element of elements)
        yield new Group(element)

      return
    }

    getDirectGroupByIndexOrThrow(index: number): Group {
      const element = this.element.querySelector(`:scope > Group:nth-of-type(${index + 1})`)

      if (element == null)
        throw new Error()

      return new Group(element)
    }

    getDirectGroupByIndexOrNull(index: number): Nullable<Group> {
      const element = this.element.querySelector(`:scope > Group:nth-of-type(${index + 1})`)

      if (element == null)
        return

      return new Group(element)
    }

    getDirectGroupByUuidOrThrow(uuid: string): Group {
      const elements = this.element.querySelectorAll(`:scope > Group`)

      for (const element of elements) {
        const group = new Group(element)

        if (group.getUuidOrThrow().getOrThrow() === uuid)
          return group

        continue
      }

      throw new Error()
    }

    getDirectGroupByUuidOrNull(uuid: string): Nullable<Group> {
      const elements = this.element.querySelectorAll(`:scope > Group`)

      for (const element of elements) {
        const group = new Group(element)

        if (group.getUuidOrThrow().getOrThrow() === uuid)
          return group

        continue
      }

      return
    }

  }

  export class Group {

    constructor(
      readonly element: Element
    ) { }

    moveOrThrow(group: Group): void {
      if (this.element.parentNode === group.element)
        return

      this.element.parentNode?.removeChild(this.element)

      group.element.appendChild(this.element)

      this.getTimesOrThrow().getLocationChangedOrThrow().setOrThrow(new Date())

      group.getTimesOrThrow().getLastModificationTimeOrThrow().setOrThrow(new Date())
    }

    getNameOrThrow(): Other.AsString {
      const element = this.element.querySelector(":scope > Name")

      if (element == null)
        throw new Error()

      return new Other.AsString(element)
    }

    getUuidOrThrow(): Other.AsUuid {
      const element = this.element.querySelector(":scope > UUID")

      if (element == null)
        throw new Error()

      return new Other.AsUuid(element)
    }

    getTimesOrThrow(): Times {
      const element = this.element.querySelector(":scope > Times")

      if (element == null)
        throw new Error()

      return new Times(element)
    }

    getIconIdOrThrow(): Other.AsInteger {
      const element = this.element.querySelector(":scope > IconID")

      if (element == null)
        throw new Error()

      return new Other.AsInteger(element)
    }

    getEnableAutoTypeOrThrow(): Other.AsBoolean {
      const element = this.element.querySelector(":scope > EnableAutoType")

      if (element == null)
        throw new Error()

      return new Other.AsBoolean(element)
    }

    getEnableSearchingOrThrow(): Other.AsBoolean {
      const element = this.element.querySelector(":scope > EnableSearching")

      if (element == null)
        throw new Error()

      return new Other.AsBoolean(element)
    }

    *getDirectGroups(): Generator<Group> {
      const elements = this.element.querySelectorAll(`:scope > Group`)

      for (const element of elements)
        yield new Group(element)

      return
    }

    getDirectGroupByIndexOrThrow(index: number): Group {
      const element = this.element.querySelector(`:scope > Group:nth-of-type(${index + 1})`)

      if (element == null)
        throw new Error()

      return new Group(element)
    }

    getDirectGroupByIndexOrNull(index: number): Nullable<Group> {
      const element = this.element.querySelector(`:scope > Group:nth-of-type(${index + 1})`)

      if (element == null)
        return

      return new Group(element)
    }

    getDirectGroupByUuidOrThrow(uuid: string): Group {
      const elements = this.element.querySelectorAll(`:scope > Group`)

      for (const element of elements) {
        const group = new Group(element)

        if (group.getUuidOrThrow().getOrThrow() === uuid)
          return group

        continue
      }

      throw new Error()
    }

    getDirectGroupByUuidOrNull(uuid: string): Nullable<Group> {
      const elements = this.element.querySelectorAll(`:scope > Group`)

      for (const element of elements) {
        const group = new Group(element)

        if (group.getUuidOrThrow().getOrThrow() === uuid)
          return group

        continue
      }

      return
    }

    *getDirectEntries(): Generator<Entry> {
      const elements = this.element.querySelectorAll(`:scope > Entry`)

      for (const element of elements)
        yield new Entry(element)

      return
    }

    getDirectEntryByIndexOrThrow(index: number): Entry {
      const element = this.element.querySelector(`:scope > Entry:nth-of-type(${index + 1})`)

      if (element == null)
        throw new Error()

      return new Entry(element)
    }

    getDirectEntryByIndexOrNull(index: number): Nullable<Entry> {
      const element = this.element.querySelector(`:scope > Entry:nth-of-type(${index + 1})`)

      if (element == null)
        return

      return new Entry(element)
    }

    getDirectEntryByUuidOrThrow(uuid: string): Entry {
      const elements = this.element.querySelectorAll(`:scope > Entry`)

      for (const element of elements) {
        const entry = new Entry(element)

        if (entry.getUuidOrThrow().getOrThrow() === uuid)
          return entry

        continue
      }

      throw new Error()
    }

    getDirectEntryByUuidOrNull(uuid: string): Nullable<Entry> {
      const elements = this.element.querySelectorAll(`:scope > Entry`)

      for (const element of elements) {
        const entry = new Entry(element)

        if (entry.getUuidOrThrow().getOrThrow() === uuid)
          return entry

        continue
      }

      return
    }

  }

  export class Times {

    constructor(
      readonly element: Element
    ) { }

    getLastModificationTimeOrThrow(): Other.AsDate {
      const element = this.element.querySelector(":scope > LastModificationTime")

      if (element == null)
        throw new Error()

      return new Other.AsDate(element)
    }

    getCreationTimeOrThrow(): Other.AsDate {
      const element = this.element.querySelector(":scope > CreationTime")

      if (element == null)
        throw new Error()

      return new Other.AsDate(element)
    }

    getLastAccessTimeOrThrow(): Other.AsDate {
      const element = this.element.querySelector(":scope > LastAccessTime")

      if (element == null)
        throw new Error()

      return new Other.AsDate(element)
    }

    getExpiresOrThrow(): Other.AsBoolean {
      const element = this.element.querySelector(":scope > Expires")

      if (element == null)
        throw new Error()

      return new Other.AsBoolean(element)
    }

    getUsageCountOrThrow(): Other.AsInteger {
      const element = this.element.querySelector(":scope > UsageCount")

      if (element == null)
        throw new Error()

      return new Other.AsInteger(element)
    }

    getLocationChangedOrThrow(): Other.AsDate {
      const element = this.element.querySelector(":scope > LocationChanged")

      if (element == null)
        throw new Error()

      return new Other.AsDate(element)
    }

  }

  export class Entry {

    constructor(
      readonly element: Element
    ) { }

    moveOrThrow($group: Group): void {
      if (this.element.parentNode === $group.element)
        return

      this.element.parentNode?.removeChild(this.element)

      $group.element.appendChild(this.element)

      this.getTimesOrThrow().getLocationChangedOrThrow().setOrThrow(new Date())

      $group.getTimesOrThrow().getLastModificationTimeOrThrow().setOrThrow(new Date())
    }

    moveToTrashOrThrow(): void {
      const $file = new KeePassFile(this.element.ownerDocument)
      const $meta = $file.getMetaOrThrow()
      const $root = $file.getRootOrThrow()

      const recybleBinEnabled = $meta.getRecycleBinEnabledOrThrow().get()

      if (!recybleBinEnabled)
        throw new Error("Recycle bin is not enabled")

      const recycleBin = $meta.getRecycleBinUuidOrThrow().get()

      const $recycleBin = $root.getGroupByUuidOrThrow(recycleBin)

      this.moveOrThrow($recycleBin)

      $meta.getRecycleBinChangedOrThrow().setOrThrow(new Date())
    }

    cloneToHistoryOrThrow(): Entry {
      return this.getHistoryOrNew().insertAndCleanOrThrow(this)
    }

    createStringOrThrow(key: string, value: string, protect = false): String {
      const $file = new KeePassFile(this.element.ownerDocument)

      const $string = $file.createStringOrThrow(key, value, protect)

      this.element.appendChild($string.element)

      this.getTimesOrThrow().getLastModificationTimeOrThrow().setOrThrow(new Date())

      return $string
    }

    getUuidOrThrow(): Other.AsUuid {
      const element = this.element.querySelector(":scope > UUID")

      if (element == null)
        throw new Error()

      return new Other.AsUuid(element)
    }

    getTimesOrThrow(): Times {
      const element = this.element.querySelector(":scope > Times")

      if (element == null)
        throw new Error()

      return new Times(element)
    }

    getHistoryOrThrow(): History {
      const element = this.element.querySelector(":scope > History")

      if (element == null)
        throw new Error()

      return new History(element)
    }

    getHistoryOrNull(): Nullable<History> {
      const element = this.element.querySelector(":scope > History")

      if (element == null)
        return

      return new History(element)
    }

    getHistoryOrNew(): History {
      const stale = this.element.querySelector(":scope > History")

      if (stale != null)
        return new History(stale)

      const fresh = this.element.ownerDocument.createElement("History")

      this.element.appendChild(fresh)

      return new History(fresh)
    }

    *getDirectStrings(): Generator<String> {
      const elements = this.element.querySelectorAll(`:scope > String`)

      for (const element of elements)
        yield new String(element)

      return
    }

    getDirectStringByIndexOrThrow(index: number): String {
      const element = this.element.querySelector(`:scope > String:nth-of-type(${index + 1})`)

      if (element == null)
        throw new Error()

      return new String(element)
    }

    getDirectStringByIndexOrNull(index: number): Nullable<String> {
      const element = this.element.querySelector(`:scope > String:nth-of-type(${index + 1})`)

      if (element == null)
        return

      return new String(element)
    }

    getDirectStringByKeyOrThrow(key: string): String {
      const elements = this.element.querySelectorAll(`:scope > String`)

      for (const element of elements) {
        const string = new String(element)

        if (string.getKeyOrThrow().get() === key)
          return string

        continue
      }

      throw new Error()
    }

    getDirectStringByKeyOrNull(key: string): Nullable<String> {
      const elements = this.element.querySelectorAll(`:scope > String`)

      for (const element of elements) {
        const string = new String(element)

        if (string.getKeyOrThrow().get() === key)
          return string

        continue
      }

      return
    }

  }

  export class String {

    constructor(
      readonly element: Element
    ) { }

    getKeyOrThrow(): Other.AsString {
      const element = this.element.querySelector(":scope > Key")

      if (element == null)
        throw new Error()

      return new Other.AsString(element)
    }

    getValueOrThrow(): Other.AsString {
      const element = this.element.querySelector(":scope > Value")

      if (element == null)
        throw new Error()

      return new Other.AsString(element)
    }

  }

  export class Value {

    constructor(
      readonly element: Element
    ) { }

    get(): string {
      return this.element.textContent
    }

    set(value: string) {
      this.element.textContent = value
    }

    get protected(): boolean {
      return this.element.getAttribute("Protected") === "True"
    }

    set protected(value: boolean) {
      if (value)
        this.element.setAttribute("Protected", "True")
      else
        this.element.removeAttribute("Protected")
    }

  }

  export class History {

    constructor(
      readonly element: Element
    ) { }

    insertAndCleanOrThrow($entry: Entry): Entry {
      const clone = new Entry($entry.element.cloneNode(true) as Element)

      const history = clone.getHistoryOrNull()

      if (history != null)
        clone.element.removeChild(history.element)

      this.element.prepend(clone.element)

      this.cleanOrThrow()

      return clone
    }

    cleanOrThrow(): void {
      const $file = new KeePassFile(this.element.ownerDocument)
      const $meta = $file.getMetaOrThrow()

      const historyMaxItems = $meta.getHistoryMaxItemsOrThrow().getOrThrow()

      if (this.element.children.length > historyMaxItems) {
        while (this.element.children.length > historyMaxItems) {
          const last = this.element.lastElementChild

          if (last == null)
            throw new Error()

          this.element.removeChild(last)
        }
      }

      const historyMaxSize = $meta.getHistoryMaxSizeOrThrow().getOrThrow()

      for (let bytes = new TextEncoder().encode(new XMLSerializer().serializeToString(this.element)); bytes.length > historyMaxSize; bytes = new TextEncoder().encode(new XMLSerializer().serializeToString(this.element))) {
        const last = this.element.lastElementChild

        if (last == null)
          throw new Error()

        this.element.removeChild(last)
      }
    }

    *getDirectEntries(): Generator<Entry> {
      const elements = this.element.querySelectorAll(`:scope > Entry`)

      for (const element of elements)
        yield new Entry(element)

      return
    }

    getDirectEntryByIndexOrThrow(index: number): Entry {
      const element = this.element.querySelector(`:scope > Entry:nth-of-type(${index + 1})`)

      if (element == null)
        throw new Error()

      return new Entry(element)
    }

    getDirectEntryByIndexOrNull(index: number): Nullable<Entry> {
      const element = this.element.querySelector(`:scope > Entry:nth-of-type(${index + 1})`)

      if (element == null)
        return

      return new Entry(element)
    }

  }

  export namespace Other {

    export class AsString {

      constructor(
        readonly element: Element
      ) { }

      get(): string {
        return this.element.textContent
      }

      set(value: string) {
        this.element.textContent = value
      }

    }

    export class AsBoolean {

      constructor(
        readonly element: Element
      ) { }

      get(): boolean {
        return this.element.textContent === "True"
      }

      set(value: boolean) {
        this.element.textContent = value ? "True" : "False"
      }

    }

    export class AsInteger {

      constructor(
        readonly element: Element
      ) { }

      getOrThrow(): number {
        const value = this.element.textContent

        if (!value)
          throw new Error()

        const number = Number(value)

        if (!Number.isSafeInteger(number))
          throw new Error()

        return number
      }

      setOrThrow(value: number) {
        if (!Number.isSafeInteger(value))
          throw new Error()
        this.element.textContent = globalThis.String(value)
      }

      incrementOrThrow() {
        this.setOrThrow(this.getOrThrow() + 1)
      }

    }

    export class AsDate {

      constructor(
        readonly element: Element
      ) { }

      getOrThrow(): Date {
        const value = this.element.textContent

        if (!value)
          throw new Error()

        const binary = Uint8Array.fromBase64(value)
        const cursor = new Cursor(binary)

        const raw = cursor.readBigUint64OrThrow(true)
        const fix = raw - 62135596800n

        return new Date(Number(fix * 1000n))
      }

      setOrThrow(value: Date) {
        const fix = BigInt(value.getTime()) / 1000n
        const raw = fix + 62135596800n

        const cursor = new Cursor(new Uint8Array(8))
        cursor.writeBigUint64OrThrow(raw, true)

        this.element.textContent = cursor.bytes.toBase64()
      }

    }

    export class AsUuid {

      constructor(
        readonly element: Element
      ) { }

      getOrThrow(): string {
        const base64 = this.element.textContent

        if (!base64)
          throw new Error()

        const bytes = Uint8Array.fromBase64(base64)

        return StringAsUuid.from(bytes)
      }

      setOrThrow(value: string) {
        const bytes = BytesAsUuid.from(value)

        const base64 = bytes.toBase64()

        this.element.textContent = base64
      }

    }

  }

}