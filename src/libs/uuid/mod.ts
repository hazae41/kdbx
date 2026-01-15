// deno-lint-ignore-file no-namespace

export namespace StringAsUuid {

  export function from(bytes: Uint8Array) {
    const base16 = bytes.toHex()

    const a = base16.slice(0, 8)
    const b = base16.slice(8, 12)
    const c = base16.slice(12, 16)
    const d = base16.slice(16, 20)
    const e = base16.slice(20, 32)

    return [a, b, c, d, e].join("-")
  }

}

export namespace BytesAsUuid {

  export function from(string: string) {
    const a = string.slice(0, 8)
    const b = string.slice(9, 13)
    const c = string.slice(14, 18)
    const d = string.slice(19, 23)
    const e = string.slice(24, 36)

    const base16 = [a, b, c, d, e].join("")

    return Uint8Array.fromHex(base16)
  }

}