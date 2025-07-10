import { Nullable } from "libs/nullable/index.js"
import { Data } from "../data/index.js"

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

      return new Data.AsString(element)
    }

    getDatabaseNameChangedOrThrow() {
      const element = this.element.querySelector(":scope > DatabaseNameChanged")

      if (element == null)
        throw new Error()

      return new Data.AsDate(element)
    }

    getGeneratorOrThrow() {
      const element = this.element.querySelector(":scope > Generator")

      if (element == null)
        throw new Error()

      return new Data.AsString(element)
    }

    getHistoryMaxItemsOrThrow() {
      const element = this.element.querySelector(":scope > HistoryMaxItems")

      if (element == null)
        throw new Error()

      return new Data.AsInteger(element)
    }

    getHistoryMaxSizeOrThrow() {
      const element = this.element.querySelector(":scope > HistoryMaxSize")

      if (element == null)
        throw new Error()

      return new Data.AsInteger(element)
    }

    getRecycleBinEnabledOrThrow() {
      const element = this.element.querySelector(":scope > RecycleBinEnabled")

      if (element == null)
        throw new Error()

      return new Data.AsBoolean(element)
    }

    getRecycleBinUuidOrThrow() {
      const element = this.element.querySelector(":scope > RecycleBinUUID")

      if (element == null)
        throw new Error()

      return new Data.AsString(element)
    }

    getRecycleBinChangedOrThrow() {
      const element = this.element.querySelector(":scope > RecycleBinChanged")

      if (element == null)
        throw new Error()

      return new Data.AsDate(element)
    }

    getSettingsChangedOrThrow() {
      const element = this.element.querySelector(":scope > SettingsChanged")

      if (element == null)
        throw new Error()

      return new Data.AsDate(element)
    }

    getDatabaseDescriptionOrThrow() {
      const element = this.element.querySelector(":scope > DatabaseDescription")

      if (element == null)
        throw new Error()

      return new Data.AsString(element)
    }

    getDatabaseDescriptionChangedOrThrow() {
      const element = this.element.querySelector(":scope > DatabaseDescriptionChanged")

      if (element == null)
        throw new Error()

      return new Data.AsDate(element)
    }

    getDefaultUserNameOrThrow() {
      const element = this.element.querySelector(":scope > DefaultUserName")

      if (element == null)
        throw new Error()

      return new Data.AsString(element)
    }

    getDefaultUserNameChangedOrThrow() {
      const element = this.element.querySelector(":scope > DefaultUserNameChanged")

      if (element == null)
        throw new Error()

      return new Data.AsDate(element)
    }

    getColorOrThrow() {
      const element = this.element.querySelector(":scope > Color")

      if (element == null)
        throw new Error()

      return new Data.AsString(element)
    }

    getDirectEntryTemplatesGroupOrThrow() {
      const element = this.element.querySelector(":scope > EntryTemplatesGroup")

      if (element == null)
        throw new Error()

      return new Data.AsString(element)
    }

    getDirectEntryTemplatesGroupChangedOrThrow() {
      const element = this.element.querySelector(":scope > EntryTemplatesGroupChanged")

      if (element == null)
        throw new Error()

      return new Data.AsDate(element)
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

      this.getTimesOrThrow().getLocationChangedOrThrow().setOrThrow(new Date())

      group.getTimesOrThrow().getLastModificationTimeOrThrow().setOrThrow(new Date())
    }

    getNameOrThrow() {
      const element = this.element.querySelector(":scope > Name")

      if (element == null)
        throw new Error()

      return new Data.AsString(element)
    }

    getUuidOrThrow() {
      const element = this.element.querySelector(":scope > UUID")

      if (element == null)
        throw new Error()

      return new Data.AsString(element)
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

      return new Data.AsInteger(element)
    }

    getEnableAutoTypeOrThrow() {
      const element = this.element.querySelector(":scope > EnableAutoType")

      if (element == null)
        throw new Error()

      return new Data.AsBoolean(element)
    }

    getEnableSearchingOrThrow() {
      const element = this.element.querySelector(":scope > EnableSearching")

      if (element == null)
        throw new Error()

      return new Data.AsBoolean(element)
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

      return new Data.AsDate(element)
    }

    getCreationTimeOrThrow() {
      const element = this.element.querySelector(":scope > CreationTime")

      if (element == null)
        throw new Error()

      return new Data.AsDate(element)
    }

    getLastAccessTimeOrThrow() {
      const element = this.element.querySelector(":scope > LastAccessTime")

      if (element == null)
        throw new Error()

      return new Data.AsDate(element)
    }

    getExpiresOrThrow() {
      const element = this.element.querySelector(":scope > Expires")

      if (element == null)
        throw new Error()

      return new Data.AsBoolean(element)
    }

    getUsageCountOrThrow() {
      const element = this.element.querySelector(":scope > UsageCount")

      if (element == null)
        throw new Error()

      return new Data.AsInteger(element)
    }

    getLocationChangedOrThrow() {
      const element = this.element.querySelector(":scope > LocationChanged")

      if (element == null)
        throw new Error()

      return new Data.AsDate(element)
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

      this.getTimesOrThrow().getLocationChangedOrThrow().setOrThrow(new Date())

      group.getTimesOrThrow().getLastModificationTimeOrThrow().setOrThrow(new Date())
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

      meta.getRecycleBinChangedOrThrow().setOrThrow(new Date())
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

      this.getTimesOrThrow().getLastModificationTimeOrThrow().setOrThrow(new Date())

      return new String($string)
    }

    getUuidOrThrow() {
      const element = this.element.querySelector(":scope > UUID")

      if (element == null)
        throw new Error()

      return new Data.AsString(element)
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

      return new Data.AsString(element)
    }

    getValueOrThrow() {
      const element = this.element.querySelector(":scope > Value")

      if (element == null)
        throw new Error()

      return new Data.AsString(element)
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

      const historyMaxItems = meta.getHistoryMaxItemsOrThrow().getOrThrow()

      if (this.element.children.length > historyMaxItems) {
        while (this.element.children.length > historyMaxItems) {
          const last = this.element.lastElementChild;

          if (last == null)
            throw new Error();

          this.element.removeChild(last);
        }
      }

      const historyMaxSize = meta.getHistoryMaxSizeOrThrow().getOrThrow()

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