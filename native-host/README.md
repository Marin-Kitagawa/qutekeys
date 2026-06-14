# QuteSurf Neovim Native Host — Installation

The native messaging host lets QuteSurf open text fields directly in Neovim.
If the host is not installed the extension falls back to the embedded ACE Vim editor automatically.

## Prerequisites

- [Node.js](https://nodejs.org) ≥ 18 in your PATH
- [Neovim](https://neovim.io) in your PATH (required for real editing; the echo stub works without it)

---

## 1. Find your extension ID

Open `chrome://extensions`, enable Developer mode, and note the **ID** for QuteSurf (looks like `abcdefghijklmnopabcdefghijklmnop`).

---

## 2. Edit the manifest

Open `native-host/com.qutesurf.nvim.json` and replace the placeholders:

| Placeholder | Replace with |
|---|---|
| `<ABSOLUTE_PATH_TO_host.js_OR_WRAPPER_SCRIPT>` | Absolute path to `host.js` **or** a wrapper script (see Windows note below) |
| `<EXTENSION_ID>` | Your extension ID from step 1 |

> **Firefox note:** Firefox uses the key `"allowed_extensions"` (an array of add-on IDs like `"qutesurf@example.com"`) instead of `"allowed_origins"`. Add both keys if you need to support both browsers, or maintain separate manifests.

---

## 3. Register the manifest

### Windows (Chrome / Chromium)

1. On Windows, `path` in the JSON must point to a `.bat` wrapper (Chrome does not directly execute `.js` files). Create `native-host\run.bat`:

   ```bat
   @echo off
   node "C:\absolute\path\to\native-host\host.js"
   ```

2. Set `path` in the manifest to the absolute path of `run.bat` (use double backslashes).

3. Register the manifest path in the Windows registry.  
   Save this as `install.reg` and double-click it (update the path):

   ```
   Windows Registry Editor Version 5.00

   [HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\com.qutesurf.nvim]
   @="C:\\absolute\\path\\to\\native-host\\com.qutesurf.nvim.json"
   ```

   For Chromium replace `Google\Chrome` with `Chromium`.  
   For Firefox, place the manifest at:  
   `HKEY_CURRENT_USER\Software\Mozilla\NativeMessagingHosts\com.qutesurf.nvim`

4. Restart the browser.

### macOS (Chrome)

Copy the manifest to:

```
~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.qutesurf.nvim.json
```

For Chromium:

```
~/Library/Application Support/Chromium/NativeMessagingHosts/com.qutesurf.nvim.json
```

For Firefox:

```
~/Library/Application Support/Mozilla/NativeMessagingHosts/com.qutesurf.nvim.json
```

Set `path` to the absolute path of `host.js` (Node executes `.js` directly on macOS/Linux).

### Linux (Chrome)

Copy the manifest to:

```
~/.config/google-chrome/NativeMessagingHosts/com.qutesurf.nvim.json
```

For Chromium:

```
~/.config/chromium/NativeMessagingHosts/com.qutesurf.nvim.json
```

For Firefox:

```
~/.mozilla/native-messaging-hosts/com.qutesurf.nvim.json
```

Set `path` to the absolute path of `host.js`.

---

## 4. Verify

Reload the extension (or restart the browser), open a text field, and run `edit-with-nvim`.  
If Neovim is found in PATH the field opens in Neovim; otherwise the ACE editor opens as the fallback.

---

## Troubleshooting

- Check `chrome://extensions` → QuteSurf → background service worker console for error messages.
- Ensure `node` is resolvable from the shell that Chrome launches (on macOS/Linux, `/usr/local/bin/node` may be needed in `path` if Node is not in the system PATH).
- The current host implementation is an **echo stub** — it sends text back unchanged. Real Neovim editing requires wiring `nvim --embed` via msgpack-rpc; see the `NEOVIM INTEGRATION POINT` comment in `host.js`.
