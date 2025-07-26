export async function gzip(data: Uint8Array) {
  const pair = new CompressionStream("gzip")

  const writer = pair.writable.getWriter()
  writer.write(data)
  writer.close()

  const response = new Response(pair.readable)

  return await response.bytes()
}

export async function gunzip(data: Uint8Array) {
  const pair = new DecompressionStream("gzip")

  const writer = pair.writable.getWriter()
  writer.write(data)
  writer.close()

  const response = new Response(pair.readable)

  return await response.bytes()
}