/* QuteSurf popup script */
/* global chrome */

(function () {
  'use strict';

  if (typeof chrome === 'undefined') return;

  const STORAGE_KEY = 'qutesurf:config';
  const PROFILES = ['qute', 'surfingkeys', 'hybrid'];

  // ── Version ──────────────────────────────────────────────────────────────
  try {
    const manifest = chrome.runtime.getManifest();
    const vEl = document.getElementById('version');
    if (vEl) vEl.textContent = 'v' + manifest.version;
  } catch (_) {}

  // ── Profile quick-switch ─────────────────────────────────────────────────
  const profileSelect = document.getElementById('profile-quick');

  PROFILES.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    profileSelect.appendChild(opt);
  });

  function loadActiveProfile() {
    return chrome.storage.local.get(STORAGE_KEY).then(result => {
      const stored = result[STORAGE_KEY];
      return (stored && stored.activeProfile) ? stored.activeProfile : 'hybrid';
    });
  }

  loadActiveProfile().then(profile => {
    profileSelect.value = profile;
  });

  profileSelect.addEventListener('change', () => {
    const chosen = profileSelect.value;
    chrome.storage.local.get(STORAGE_KEY).then(result => {
      const stored = result[STORAGE_KEY] || {};
      const next = Object.assign({}, stored, { activeProfile: chosen });
      return chrome.storage.local.set({ [STORAGE_KEY]: next });
    }).then(() => {
      const statusEl = document.getElementById('status');
      if (statusEl) {
        statusEl.textContent = 'Profile set to ' + chosen;
        setTimeout(() => { statusEl.textContent = ''; }, 2000);
      }
    });
  });

  // ── Open options ─────────────────────────────────────────────────────────
  document.getElementById('open-options-btn').addEventListener('click', () => {
    if (chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    }
  });

})();
