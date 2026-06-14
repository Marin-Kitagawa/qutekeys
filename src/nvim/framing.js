'use strict';

/**
 * framing.js — Chrome Native Messaging length-prefix codec.
 *
 * Chrome native messaging frames each message as:
 *   [4 bytes: UInt32LE message length][N bytes: UTF-8 JSON body]
 *
 * This module is pure Node/Buffer code — no browser globals — and is fully
 * unit-testable under Jest/Node.
 */

// Chrome's native-messaging limit is 1 MB per message from the extension and
// 64 MB to the extension. We cap decoded frames well under that to bound memory
// and reject a malformed/oversized length header before allocating/slicing.
const MAX_FRAME_BYTES = 64 * 1024 * 1024; // 64 MiB hard ceiling

/**
 * Encode a JS object into a native-messaging frame.
 *
 * @param {object} obj  Any JSON-serialisable value.
 * @returns {Buffer}    4-byte LE length header followed by the UTF-8 JSON body.
 */
function encodeMessage(obj) {
  const body = Buffer.from(JSON.stringify(obj), 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length, 0);
  return Buffer.concat([header, body]);
}

/**
 * Decode zero or more native-messaging frames from a Buffer.
 *
 * Handles partial / truncated input: any bytes that do not form a complete
 * frame are returned as `rest` so the caller can prepend them to the next
 * chunk received from stdin.
 *
 * @param {Buffer} buffer  Raw bytes (may contain multiple frames or a partial frame).
 * @returns {{ messages: object[], rest: Buffer }}
 */
function decodeMessages(buffer) {
  const messages = [];
  let offset = 0;

  while (true) {
    // Need at least 4 bytes for the length header.
    if (buffer.length - offset < 4) break;

    const bodyLen = buffer.readUInt32LE(offset);

    // Reject an absurd/oversized declared length before we attempt to wait for
    // or slice that many bytes (DoS / memory-exhaustion guard).
    if (bodyLen > MAX_FRAME_BYTES) {
      throw new RangeError('native-messaging frame too large: ' + bodyLen);
    }

    // Check the full frame (header + body) is present.
    if (buffer.length - offset < 4 + bodyLen) break;

    const bodyStart = offset + 4;
    const body = buffer.slice(bodyStart, bodyStart + bodyLen);
    messages.push(JSON.parse(body.toString('utf8')));
    offset = bodyStart + bodyLen;
  }

  return { messages, rest: buffer.slice(offset) };
}

module.exports = { encodeMessage, decodeMessages, MAX_FRAME_BYTES };
