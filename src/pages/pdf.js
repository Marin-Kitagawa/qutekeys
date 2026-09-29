'use strict';

/**
 * QuteSurf minimal PDF viewer (Wave 8).
 *
 * Opens `pdf.html#file=<encoded pdf url>`, renders pages lazily with
 * pdfjs-dist (copied to ./pdfjs/ by webpack). Keyboard: J/K or N/P page
 * jumps, gg/G first/last page, +/-/0 zoom.
 */

import * as pdfjsLib from './pdfjs/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = './pdfjs/pdf.worker.min.mjs';

const viewer = document.getElementById('viewer');
const errorBox = document.getElementById('error');
const titleEl = document.getElementById('title');
const pageinfo = document.getElementById('pageinfo');

let pdfDoc = null;
let pageNum = 1; // 1-based current page
let scale = 1.0;
const pageCanvases = new Map(); // 1-based page number → canvas
const pending = new Set(); // pages currently rendering

function showError(msg) {
  errorBox.hidden = false;
  errorBox.textContent = msg;
}

function getParams() {
  // Accept both #file=... (used by the tab redirect) and ?file=... (manual)
  const raw = location.hash.startsWith('#') ? location.hash.slice(1) : location.search.slice(1);
  const params = new URLSearchParams(raw);
  return params;
}

async function renderPage(num) {
  if (!pdfDoc || pending.has(num) || pageCanvases.has(num)) return;
  pending.add(num);
  try {
    const page = await pdfDoc.getPage(num);
    const base = page.getViewport({ scale: 1 });
    const maxWidth = Math.min(window.innerWidth * 0.94, 1400);
    const effScale = Math.min(scale, maxWidth / base.width);
    const viewport = page.getViewport({ scale: effScale * (window.devicePixelRatio || 1) });

    let canvas = pageCanvases.get(num);
    if (!canvas) {
      const wrap = document.createElement('div');
      wrap.className = 'page-wrap';
      canvas = document.createElement('canvas');
      const badge = document.createElement('span');
      badge.className = 'page-num';
      badge.textContent = String(num);
      wrap.appendChild(canvas);
      wrap.appendChild(badge);
      viewer.appendChild(wrap);
      pageCanvases.set(num, canvas);
    }
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.width = Math.floor(viewport.width / (window.devicePixelRatio || 1)) + 'px';
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
  } catch (err) {
    showError('Failed to render page ' + num + ': ' + (err && err.message ? err.message : err));
  } finally {
    pending.delete(num);
  }
}

function currentPage() {
  // The current page is the first canvas whose bottom edge is below the toolbar
  const toolbarH = 42;
  for (const [num, canvas] of [...pageCanvases.entries()].sort((a, b) => a[0] - b[0])) {
    const rect = canvas.getBoundingClientRect();
    if (rect.bottom > toolbarH + 10) return num;
  }
  return pageNum;
}

function updateInfo() {
  pageNum = currentPage();
  pageinfo.textContent = pageNum + ' / ' + (pdfDoc ? pdfDoc.numPages : '–');
}

function ensureAround(n) {
  for (let k = Math.max(1, n - 1); k <= Math.min(pdfDoc.numPages, n + 1); k++) {
    renderPage(k);
  }
}

function gotoPage(n) {
  if (!pdfDoc) return;
  const target = Math.min(Math.max(1, n), pdfDoc.numPages);
  pageNum = target;
  ensureAround(target);
  const canvas = pageCanvases.get(target);
  if (canvas) {
    canvas.scrollIntoView({ block: 'start' });
    updateInfo();
  } else {
    // Page not rendered yet: render it, then scroll
    renderPage(target).then(() => {
      const c = pageCanvases.get(target);
      if (c) c.scrollIntoView({ block: 'start' });
      updateInfo();
    });
  }
}

document.getElementById('prev').addEventListener('click', () => gotoPage(currentPage() - 1));
document.getElementById('next').addEventListener('click', () => gotoPage(currentPage() + 1));
document.getElementById('zoomin').addEventListener('click', () => { scale = Math.min(4, scale + 0.25); rerenderAll(); });
document.getElementById('zoomout').addEventListener('click', () => { scale = Math.max(0.25, scale - 0.25); rerenderAll(); });
document.getElementById('zoomfit').addEventListener('click', () => { scale = 1; rerenderAll(); });

function rerenderAll() {
  // Drop rendered canvases and re-render the current neighbourhood
  for (const [, canvas] of pageCanvases) canvas.remove();
  pageCanvases.clear();
  ensureAround(currentPage());
  updateInfo();
}

document.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  switch (e.key) {
    case 'j': case 'n': case 'PageDown':
      window.scrollBy({ top: Math.round(window.innerHeight * 0.85), behavior: 'smooth' });
      e.preventDefault(); break;
    case 'k': case 'p': case 'PageUp':
      window.scrollBy({ top: -Math.round(window.innerHeight * 0.85), behavior: 'smooth' });
      e.preventDefault(); break;
    case 'g':
      gotoPage(1); e.preventDefault(); break;
    case 'G':
      gotoPage(pdfDoc ? pdfDoc.numPages : 1); e.preventDefault(); break;
    case '+': case '=':
      scale = Math.min(4, scale + 0.25); rerenderAll(); e.preventDefault(); break;
    case '-':
      scale = Math.max(0.25, scale - 0.25); rerenderAll(); e.preventDefault(); break;
    case '0':
      scale = 1; rerenderAll(); e.preventDefault(); break;
    default:
      return;
  }
});

window.addEventListener('scroll', () => updateInfo(), { passive: true });
window.addEventListener('resize', () => { rerenderAll(); });

async function init() {
  const params = getParams();
  const file = params.get('file');
  if (!file) {
    showError('No file given. Open with: pdf.html#file=<encoded-pdf-url>');
    return;
  }
  titleEl.textContent = decodeURIComponent(file).split('/').pop() || file;
  try {
    pdfDoc = await pdfjsLib.getDocument({ url: file }).promise;
    ensureAround(1);
    updateInfo();
  } catch (err) {
    showError('Failed to load PDF: ' + (err && err.message ? err.message : err) +
      '\n(The server may not allow cross-origin fetches.)');
  }
}

init();
