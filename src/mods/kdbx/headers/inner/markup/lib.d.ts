interface NodeListOf<TNode extends Node> {
  [Symbol.iterator](): IterableIterator<TNode>;
}