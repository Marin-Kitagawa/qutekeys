'use strict';

/**
 * TrieNode — a node in the prefix trie.
 *
 * Properties:
 *   children: Map<string, TrieNode>
 *   command:  string | null   — non-null if this node is a terminal (complete binding)
 */
class TrieNode {
  constructor() {
    this.children = new Map();
    this.command = null;
  }
}

/**
 * Trie — a prefix trie mapping key-sequence strings to command strings.
 *
 * Each character in a sequence is one step in the trie.
 *
 * Public API (used by KeyMap):
 *   insert(seq, command)         — store a binding
 *   remove(seq)                  — remove a binding (prunes empty nodes)
 *   getNode(prefix)              — return the TrieNode reached by prefix, or null
 *   isTerminal(node)             — true if node has a command
 *   isPurePrefix(node)           — true if node has children (further keys possible)
 *   getWords(node, prefix)       — collect all complete sequences rooted at node,
 *                                  prepending prefix string
 */
class Trie {
  constructor() {
    this._root = new TrieNode();
  }

  /**
   * Insert a sequence → command binding.
   * @param {string} seq
   * @param {string} command
   */
  insert(seq, command) {
    let node = this._root;
    for (const ch of seq) {
      if (!node.children.has(ch)) {
        node.children.set(ch, new TrieNode());
      }
      node = node.children.get(ch);
    }
    node.command = command;
  }

  /**
   * Remove the binding for seq.
   * Prunes now-empty non-terminal ancestor nodes.
   * @param {string} seq
   */
  remove(seq) {
    // Walk and record the path
    const path = [{ node: this._root, ch: null }];
    let node = this._root;
    for (const ch of seq) {
      const child = node.children.get(ch);
      if (!child) return; // seq not in trie
      path.push({ node: child, ch });
      node = child;
    }
    // Clear terminal marker
    node.command = null;
    // Prune ancestors that are now empty (no command, no children)
    for (let i = path.length - 1; i > 0; i--) {
      const { node: current } = path[i];
      if (current.command === null && current.children.size === 0) {
        const parent = path[i - 1].node;
        parent.children.delete(path[i].ch);
      } else {
        break;
      }
    }
  }

  /**
   * Walk the trie along prefix and return the node, or null if not found.
   * @param {string} prefix
   * @returns {TrieNode|null}
   */
  getNode(prefix) {
    let node = this._root;
    for (const ch of prefix) {
      node = node.children.get(ch);
      if (!node) return null;
    }
    return node;
  }

  /**
   * True if node has a command (is a complete binding).
   * @param {TrieNode} node
   */
  isTerminal(node) {
    return node !== null && node.command !== null;
  }

  /**
   * True if node has child keys (so current prefix can be extended).
   * @param {TrieNode} node
   */
  isPurePrefix(node) {
    return node !== null && node.children.size > 0;
  }

  /**
   * Collect all complete sequences reachable from node, prepending prefix.
   * @param {TrieNode} node
   * @param {string} prefix — the key-path already consumed to reach node
   * @returns {string[]}
   */
  getWords(node, prefix) {
    if (!node) return [];
    const result = [];
    const walk = (n, acc) => {
      if (n.command !== null) result.push(acc);
      for (const [ch, child] of n.children) {
        walk(child, acc + ch);
      }
    };
    walk(node, prefix);
    return result;
  }
}

module.exports = { Trie, TrieNode };
