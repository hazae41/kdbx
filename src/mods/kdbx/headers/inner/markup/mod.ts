// deno-lint-ignore-file no-namespace

/// <reference types="./lib.d.ts" />

import type { Nullable } from "@/libs/nullable/mod.ts"
import { BytesAsUuid, StringAsUuid } from "@/libs/uuid/mod.ts"
import { Cursor } from "@hazae41/cursor"

export class KeePassFile {

  constructor(
    readonly document: Document
  ) { }

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

    getDatabaseNameOrNull(): Nullable<Other.AsString> {
      const element = this.element.querySelector(":scope > DatabaseName")

      if (element == null)
        return

      return new Other.AsString(element)
    }

    getDatabaseNameChangedOrNull(): Nullable<Other.AsDate> {
      const stale = this.element.querySelector(":scope > DatabaseNameChanged")

      if (stale == null)
        return

      return new Other.AsDate(stale)
    }

    setDatabaseNameChanged(date = new Date()): void {
      const stale = this.element.querySelector(":scope > DatabaseNameChanged")

      if (stale != null) {
        const value = new Other.AsDate(stale)

        value.setOrThrow(date)

        return
      }

      const fresh = this.element.ownerDocument.createElement("DatabaseNameChanged")

      this.element.appendChild(fresh)

      const value = new Other.AsDate(fresh)

      value.setOrThrow(date)
    }

    getGeneratorOrNull(): Nullable<Other.AsString> {
      const element = this.element.querySelector(":scope > Generator")

      if (element == null)
        return

      return new Other.AsString(element)
    }

    getHistoryMaxItemsOrNull(): Nullable<Other.AsInteger> {
      const element = this.element.querySelector(":scope > HistoryMaxItems")

      if (element == null)
        return

      return new Other.AsInteger(element)
    }

    getHistoryMaxSizeOrNull(): Nullable<Other.AsInteger> {
      const element = this.element.querySelector(":scope > HistoryMaxSize")

      if (element == null)
        return

      return new Other.AsInteger(element)
    }

    getRecycleBinEnabledOrNull(): Nullable<Other.AsBoolean> {
      const element = this.element.querySelector(":scope > RecycleBinEnabled")

      if (element == null)
        return

      return new Other.AsBoolean(element)
    }

    getRecycleBinUuidOrThrow(): Other.AsUuid {
      const element = this.element.querySelector(":scope > RecycleBinUUID")

      if (element == null)
        throw new Error()

      return new Other.AsUuid(element)
    }

    getRecycleBinChangedOrNull(): Nullable<Other.AsDate> {
      const element = this.element.querySelector(":scope > RecycleBinChanged")

      if (element == null)
        return

      return new Other.AsDate(element)
    }

    setRecycleBinChanged(date = new Date()): void {
      const stale = this.element.querySelector(":scope > RecycleBinChanged")

      if (stale != null) {
        const value = new Other.AsDate(stale)

        value.setOrThrow(date)

        return
      }

      const fresh = this.element.ownerDocument.createElement("RecycleBinChanged")

      this.element.appendChild(fresh)

      const value = new Other.AsDate(fresh)

      value.setOrThrow(date)
    }

    getSettingsChangedOrNull(): Nullable<Other.AsDate> {
      const element = this.element.querySelector(":scope > SettingsChanged")

      if (element == null)
        return

      return new Other.AsDate(element)
    }

    setSettingsChanged(date = new Date()): void {
      const stale = this.element.querySelector(":scope > SettingsChanged")

      if (stale != null) {
        const value = new Other.AsDate(stale)

        value.setOrThrow(date)

        return
      }

      const fresh = this.element.ownerDocument.createElement("SettingsChanged")

      this.element.appendChild(fresh)

      const value = new Other.AsDate(fresh)

      value.setOrThrow(date)
    }

    getDatabaseDescriptionOrNull(): Nullable<Other.AsString> {
      const element = this.element.querySelector(":scope > DatabaseDescription")

      if (element == null)
        return

      return new Other.AsString(element)
    }

    getDatabaseDescriptionChangedOrNull(): Nullable<Other.AsDate> {
      const element = this.element.querySelector(":scope > DatabaseDescriptionChanged")

      if (element == null)
        return

      return new Other.AsDate(element)
    }

    setDatabaseDescriptionChanged(date = new Date()): void {
      const stale = this.element.querySelector(":scope > DatabaseDescriptionChanged")

      if (stale != null) {
        const value = new Other.AsDate(stale)

        value.setOrThrow(date)

        return
      }

      const fresh = this.element.ownerDocument.createElement("DatabaseDescriptionChanged")

      this.element.appendChild(fresh)

      const value = new Other.AsDate(fresh)

      value.setOrThrow(date)
    }

    getDefaultUserNameOrNull(): Nullable<Other.AsString> {
      const element = this.element.querySelector(":scope > DefaultUserName")

      if (element == null)
        return

      return new Other.AsString(element)
    }

    getDefaultUserNameChangedOrNull(): Nullable<Other.AsDate> {
      const element = this.element.querySelector(":scope > DefaultUserNameChanged")

      if (element == null)
        return

      return new Other.AsDate(element)
    }

    setDefaultUserNameChanged(date = new Date()): void {
      const stale = this.element.querySelector(":scope > DefaultUserNameChanged")

      if (stale != null) {
        const value = new Other.AsDate(stale)

        value.setOrThrow(date)

        return
      }

      const fresh = this.element.ownerDocument.createElement("DefaultUserNameChanged")

      this.element.appendChild(fresh)

      const value = new Other.AsDate(fresh)

      value.setOrThrow(date)
    }

    getColorOrNull(): Nullable<Other.AsString> {
      const element = this.element.querySelector(":scope > Color")

      if (element == null)
        return

      return new Other.AsString(element)
    }

    getEntryTemplatesGroupOrNull(): Nullable<Other.AsString> {
      const element = this.element.querySelector(":scope > EntryTemplatesGroup")

      if (element == null)
        return

      return new Other.AsString(element)
    }

    getEntryTemplatesGroupChangedOrNull(): Nullable<Other.AsDate> {
      const element = this.element.querySelector(":scope > EntryTemplatesGroupChanged")

      if (element == null)
        return

      return new Other.AsDate(element)
    }

    setEntryTemplatesGroupChanged(date = new Date()): void {
      const stale = this.element.querySelector(":scope > EntryTemplatesGroupChanged")

      if (stale != null) {
        const value = new Other.AsDate(stale)

        value.setOrThrow(date)

        return
      }

      const fresh = this.element.ownerDocument.createElement("EntryTemplatesGroupChanged")

      this.element.appendChild(fresh)

      const value = new Other.AsDate(fresh)

      value.setOrThrow(date)
    }

  }

  export class Root {

    constructor(
      readonly element: Element
    ) { }

    addGroupOrThrow(name: string): KeePassFile.Group {
      const $group = new KeePassFile.Group(this.element.ownerDocument.createElement("Group"))

      {
        const $name = new KeePassFile.Other.AsString(this.element.ownerDocument.createElement("Name"))
        const $uuid = new KeePassFile.Other.AsUuid(this.element.ownerDocument.createElement("UUID"))
        const $times = new KeePassFile.Times(this.element.ownerDocument.createElement("Times"))

        $name.set(name)
        $uuid.setOrThrow(crypto.randomUUID())

        {
          const $creationTime = new KeePassFile.Other.AsDate(this.element.ownerDocument.createElement("CreationTime"))

          $creationTime.setOrThrow(new Date())

          $times.element.appendChild($creationTime.element)
        }

        $group.element.appendChild($name.element)
        $group.element.appendChild($uuid.element)
        $group.element.appendChild($times.element)
      }

      this.element.appendChild($group.element)

      return $group
    }

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

    addEntryOrThrow(): KeePassFile.Entry {
      const $entry = new KeePassFile.Entry(this.element.ownerDocument.createElement("Entry"))

      {
        const $uuid = new KeePassFile.Other.AsUuid(this.element.ownerDocument.createElement("UUID"))
        const $times = new KeePassFile.Times(this.element.ownerDocument.createElement("Times"))

        $uuid.setOrThrow(crypto.randomUUID())

        {
          const $creationTime = new KeePassFile.Other.AsDate(this.element.ownerDocument.createElement("CreationTime"))

          $creationTime.setOrThrow(new Date())

          $times.element.appendChild($creationTime.element)
        }

        $entry.element.appendChild($uuid.element)
        $entry.element.appendChild($times.element)
      }

      this.element.appendChild($entry.element)

      this.getTimesOrNew().setLastModificationTime()

      return $entry
    }

    moveOrThrow(group: Group): void {
      if (this.element.parentNode === group.element)
        return

      this.element.parentNode?.removeChild(this.element)

      group.element.appendChild(this.element)

      this.getTimesOrNew().setLocationChanged()

      group.getTimesOrNew().setLastModificationTime()
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

    getTimesOrNew(): Times {
      const stale = this.element.querySelector(":scope > Times")

      if (stale != null)
        return new Times(stale)

      const $times = new Times(this.element.ownerDocument.createElement("Times"))

      {
        const $creationTime = new Other.AsDate(this.element.ownerDocument.createElement("CreationTime"))

        $creationTime.setOrThrow(new Date())

        $times.element.appendChild($creationTime.element)
      }

      this.element.appendChild($times.element)

      return $times
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

    getCreationTimeOrThrow(): Other.AsDate {
      const element = this.element.querySelector(":scope > CreationTime")

      if (element == null)
        throw new Error()

      return new Other.AsDate(element)
    }

    getLastModificationTimeOrNull(): Nullable<Other.AsDate> {
      const element = this.element.querySelector(":scope > LastModificationTime")

      if (element == null)
        return

      return new Other.AsDate(element)
    }

    setLastModificationTime(date = new Date()): void {
      const stale = this.element.querySelector(":scope > LastModificationTime")

      if (stale != null) {
        const value = new Other.AsDate(stale)

        value.setOrThrow(date)

        return
      }

      const fresh = this.element.ownerDocument.createElement("LastModificationTime")

      this.element.appendChild(fresh)

      const value = new Other.AsDate(fresh)

      value.setOrThrow(date)
    }

    getLastAccessTimeOrNull(): Nullable<Other.AsDate> {
      const element = this.element.querySelector(":scope > LastAccessTime")

      if (element == null)
        return

      return new Other.AsDate(element)
    }

    setLastAccessTime(date = new Date()): void {
      const stale = this.element.querySelector(":scope > LastAccessTime")

      if (stale != null) {
        const value = new Other.AsDate(stale)

        value.setOrThrow(date)

        return
      }

      const fresh = this.element.ownerDocument.createElement("LastAccessTime")

      this.element.appendChild(fresh)

      const value = new Other.AsDate(fresh)

      value.setOrThrow(date)
    }

    getExpiresOrNull(): Nullable<Other.AsBoolean> {
      const element = this.element.querySelector(":scope > Expires")

      if (element == null)
        return

      return new Other.AsBoolean(element)
    }

    getUsageCountOrNull(): Nullable<Other.AsInteger> {
      const element = this.element.querySelector(":scope > UsageCount")

      if (element == null)
        return

      return new Other.AsInteger(element)
    }

    incrementUsageCount(): void {
      const stale = this.element.querySelector(":scope > UsageCount")

      if (stale != null) {
        const value = new Other.AsInteger(stale)

        value.incrementOrThrow()

        return
      }

      const fresh = this.element.ownerDocument.createElement("UsageCount")

      this.element.appendChild(fresh)

      const value = new Other.AsInteger(fresh)

      value.setOrThrow(1)
    }

    getLocationChangedOrNull(): Nullable<Other.AsDate> {
      const element = this.element.querySelector(":scope > LocationChanged")

      if (element == null)
        return

      return new Other.AsDate(element)
    }

    setLocationChanged(date = new Date()): void {
      const stale = this.element.querySelector(":scope > LocationChanged")

      if (stale != null) {
        const value = new Other.AsDate(stale)

        value.setOrThrow(date)

        return
      }

      const fresh = this.element.ownerDocument.createElement("LocationChanged")

      this.element.appendChild(fresh)

      const value = new Other.AsDate(fresh)

      value.setOrThrow(date)
    }

  }

  export class Entry {

    constructor(
      readonly element: Element
    ) { }

    saveOrThrow(): Entry {
      return this.getHistoryOrNew().pushOrThrow(this)
    }

    moveOrThrow($group: Group): void {
      if (this.element.parentNode === $group.element)
        return

      this.element.parentNode?.removeChild(this.element)

      $group.element.appendChild(this.element)

      this.getTimesOrNew().setLocationChanged()

      $group.getTimesOrNew().setLastModificationTime()
    }

    trashOrThrow(): void {
      const $file = new KeePassFile(this.element.ownerDocument)
      const $meta = $file.getMetaOrThrow()
      const $root = $file.getRootOrThrow()

      const recybleBinEnabled = $meta.getRecycleBinEnabledOrNull()?.get()

      if (!recybleBinEnabled) {
        this.element.parentNode?.removeChild(this.element)

        return
      }

      const recycleBin = $meta.getRecycleBinUuidOrThrow().getOrThrow()

      const $recycleBin = $root.getGroupByUuidOrThrow(recycleBin)

      this.moveOrThrow($recycleBin)
    }

    addStringOrThrow(key: string, value: string, protect = false): String {
      const $string = new KeePassFile.String(this.element.ownerDocument.createElement("String"))

      {
        const $key = new KeePassFile.Other.AsString(this.element.ownerDocument.createElement("Key"))
        const $value = new KeePassFile.Value(this.element.ownerDocument.createElement("Value"))

        $key.set(key)
        $value.set(value)

        $value.protected = protect

        $string.element.appendChild($key.element)
        $string.element.appendChild($value.element)
      }

      this.element.appendChild($string.element)

      this.getTimesOrNew().setLastModificationTime()

      return $string
    }

    getUuidOrThrow(): Other.AsUuid {
      const element = this.element.querySelector(":scope > UUID")

      if (element == null)
        throw new Error()

      return new Other.AsUuid(element)
    }

    getTimesOrNew(): Times {
      const stale = this.element.querySelector(":scope > Times")

      if (stale != null)
        return new Times(stale)

      const $times = new Times(this.element.ownerDocument.createElement("Times"))

      {
        const $creationTime = new Other.AsDate(this.element.ownerDocument.createElement("CreationTime"))

        $creationTime.setOrThrow(new Date())

        $times.element.appendChild($creationTime.element)
      }

      this.element.appendChild($times.element)

      return $times
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

    *getStrings(): Generator<String> {
      const elements = this.element.querySelectorAll(`:scope > String`)

      for (const element of elements)
        yield new String(element)

      return
    }

    getStringByIndexOrNull(index: number): Nullable<String> {
      const element = this.element.querySelector(`:scope > String:nth-of-type(${index + 1})`)

      if (element == null)
        return

      return new String(element)
    }

    getStringByKeyOrNull(key: string): Nullable<String> {
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

    pushOrThrow($entry: Entry): Entry {
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

      const historyMaxItems = $meta.getHistoryMaxItemsOrNull()?.getOrThrow()

      if (historyMaxItems != null && this.element.children.length > historyMaxItems) {
        while (this.element.children.length > historyMaxItems) {
          const last = this.element.lastElementChild

          if (last == null)
            throw new Error()

          this.element.removeChild(last)
        }
      }

      const historyMaxSize = $meta.getHistoryMaxSizeOrNull()?.getOrThrow()

      if (historyMaxSize != null) {
        for (let bytes = new TextEncoder().encode(new XMLSerializer().serializeToString(this.element)); bytes.length > historyMaxSize; bytes = new TextEncoder().encode(new XMLSerializer().serializeToString(this.element))) {
          const last = this.element.lastElementChild

          if (last == null)
            throw new Error()

          this.element.removeChild(last)
        }
      }
    }

    *getDirectEntries(): Generator<Entry> {
      const elements = this.element.querySelectorAll(`:scope > Entry`)

      for (const element of elements)
        yield new Entry(element)

      return
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