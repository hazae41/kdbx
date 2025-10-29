declare const Buffer: typeof import("node:buffer").Buffer

export namespace Buffers {

  export function fromView(view: ArrayBufferView) {
    return Buffer.from(view.buffer, view.byteOffset, view.byteLength)
  }

}