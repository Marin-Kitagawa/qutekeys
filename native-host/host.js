#!/usr/bin/env node
'use strict';

/**
 * QuteSurf Native Messaging Host
 * ================================
 * This script is a Chrome/Firefox native-messaging host.  It is launched by
 * the browser (not by the user) whenever the extension calls
 *   chrome.runtime.connectNative('com.qutesurf.nvim')
 *
 * INSTALL
 * -------
 * See native-host/README.md for platform-specific registration instructions.
 *
 * PROTOCOL
 * --------
 * Chrome native messaging uses a 4-byte little-endian length prefix followed
 * by a UTF-8 JSON body.  See src/nvim/framing.js for the codec.
 *
 * NEOVIM INTEGRATION POINT
 * ------------------------
 * The current implementation echoes the text back so the extension can fall
 * back gracefully if nvim is not installed.  To wire up real nvim editing:
 *
 *   1. Replace the echo handler below with actual nvim --embed spawning.
 *   2. Use a msgpack-rpc library (e.g. `neovim` npm package) to attach to the
 *      spawned process:
 *
 *        const { attach } = require('neovim');
 *        const nvimProc = require('child_process').spawn('nvim', ['--embed'], {
 *          stdio: ['pipe', 'pipe', 'inherit'],
 *        });
 *        const nvim = await attach({ proc: nvimProc });
 *        await nvim.command('set filetype=text');
 *        // write initial text into a scratch buffer, wait for :wq, read result
 *
 *   3. On :wq send { type: 'edited', text: <new_text> } back to the extension.
 *   4. On :q! send { type: 'cancelled' }.
 *
 * REQUIREMENTS
 * ------------
 *   • Node.js ≥ 18  (ships with Buffer + readable streams)
 *   • nvim in PATH (for the real integration; echo works without it)
 */

const { encodeMessage, decodeMessages } = require('../src/nvim/framing');

let _pending = Buffer.alloc(0);

process.stdin.on('readable', () => {
  let chunk;
  // eslint-disable-next-line no-cond-assign
  while ((chunk = process.stdin.read()) !== null) {
    _pending = Buffer.concat([_pending, chunk]);
  }

  let decoded;
  try {
    decoded = decodeMessages(_pending);
  } catch (err) {
    // Malformed / oversized frame — refuse and reset the buffer rather than
    // letting a bad length header wedge or OOM the host.
    sendMessage({ type: 'error', error: 'protocol error: ' + String(err && err.message ? err.message : err) });
    _pending = Buffer.alloc(0);
    return;
  }
  _pending = decoded.rest;

  for (const msg of decoded.messages) {
    handleMessage(msg);
  }
});

process.stdin.on('end', () => {
  process.exit(0);
});

/**
 * Handle a single decoded message from the extension.
 *
 * @param {{ type: string, text?: string }} msg
 */
function handleMessage(msg) {
  // Validate structure: must be a plain object with a string `type`. Never
  // pass message content to a shell or eval — the integration below only ever
  // echoes text or, when wired up, spawns nvim via an args ARRAY (no shell).
  if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') {
    sendMessage({ type: 'error', error: 'invalid message structure' });
    return;
  }
  if (msg.type === 'edit') {
    // ── INTEGRATION POINT ────────────────────────────────────────────────────
    // Replace the echo below with nvim --embed spawning + msgpack-rpc.
    // See the NEOVIM INTEGRATION POINT comment at the top of this file.
    // ─────────────────────────────────────────────────────────────────────────
    sendMessage({ type: 'edited', text: msg.text || '' });
  } else if (msg.type === 'ping') {
    sendMessage({ type: 'pong' });
  } else {
    sendMessage({ type: 'error', error: 'Unknown message type: ' + msg.type });
  }
}

/**
 * Send a message to the extension via stdout (4-byte framing).
 *
 * @param {object} obj
 */
function sendMessage(obj) {
  const frame = encodeMessage(obj);
  process.stdout.write(frame);
}
