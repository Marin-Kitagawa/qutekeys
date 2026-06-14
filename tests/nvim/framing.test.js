const { encodeMessage, decodeMessages } = require('../../src/nvim/framing');
test('encode then decode round-trips a JSON message', () => {
  const buf = encodeMessage({ type: 'edit', text: 'hello' });
  const { messages, rest } = decodeMessages(buf);
  expect(messages).toEqual([{ type: 'edit', text: 'hello' }]);
  expect(rest.length).toBe(0);
});
test('encode prefixes a 4-byte little-endian length', () => {
  const buf = encodeMessage({ a: 1 });
  const body = JSON.stringify({ a: 1 });
  // first 4 bytes = length, little-endian
  const len = buf[0] | (buf[1]<<8) | (buf[2]<<16) | (buf[3]<<24);
  expect(len).toBe(Buffer.byteLength(body));
  expect(buf.length).toBe(4 + len);
});
test('decodeMessages handles multiple concatenated frames', () => {
  const a = encodeMessage({ n: 1 }); const b = encodeMessage({ n: 2 });
  const combined = Buffer.concat([a, b]);
  const { messages, rest } = decodeMessages(combined);
  expect(messages).toEqual([{ n: 1 }, { n: 2 }]);
  expect(rest.length).toBe(0);
});
test('decodeMessages returns the incomplete tail as rest', () => {
  const a = encodeMessage({ n: 1 });
  const partial = a.slice(0, a.length - 2); // truncated frame
  const { messages, rest } = decodeMessages(partial);
  expect(messages).toEqual([]);
  expect(rest.length).toBe(partial.length);
});
test('decodeMessages rejects an oversized declared frame length', () => {
  const { MAX_FRAME_BYTES } = require('../../src/nvim/framing');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(MAX_FRAME_BYTES + 1, 0); // claim a frame bigger than the ceiling
  expect(() => decodeMessages(header)).toThrow(/too large/);
});
