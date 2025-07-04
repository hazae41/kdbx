export namespace XML {

  export function format(document: Document, tab: string = " "): string {
    const text = new XMLSerializer().serializeToString(document as any)

    let result = ""
    let indent = 0

    const nodes = text.split(/>\s*</)

    for (const node of nodes) {
      if (node.match(/^\/\w/))
        indent--

      result += tab.repeat(indent) + '<' + node + '>\r\n';

      if (node.match(/^<?\w[^>]*[^\/]$/))
        indent++

      continue
    }

    return result.slice(1, result.length - 3);
  }

}