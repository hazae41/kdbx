import { Cursor } from "@hazae41/cursor"
import { TLV } from "libs/tlv/index.js"

export class Headers {

  constructor() { }

}

export namespace Headers {

  export function readOrThrow(cursor: Cursor) {
    while (true) {
      const tlv = TLV.readOrThrow(cursor)

      if (tlv.type === 0)
        break

      console.log(tlv)
      continue
    }

    return new Headers()
  }

}