// Verify the help/cheatsheet page shows REAL keybindings (not "unbound").
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(__dirname, '../dist/chrome');
const OUT = path.resolve(__dirname, '../dist');
const log = (...a) => console.log('[help]', ...a);

const browser = await puppeteer.launch({ headless: 'new', args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
await new Promise((r) => setTimeout(r, 900));
const sw = browser.targets().find((t) => t.type() === 'service_worker' && /background\.js/.test(t.url() || ''));
const extId = sw ? new globalThis.URL(sw.url()).host : null;
log('ext id:', extId);

const page = await browser.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(String(e.message)));
await page.goto(`chrome-extension://${extId}/pages/help.html`, { waitUntil: 'domcontentloaded' });
await new Promise((r) => setTimeout(r, 900)); // wait for keymap-get round-trip

const stats = await page.evaluate(() => {
  const unbound = document.querySelectorAll('.no-binding').length;
  // sample a few known commands' key cells
  const rows = [...document.querySelectorAll('*')];
  return { unbound, total: document.body.innerText.length > 0 };
});
log('unbound count on page:', stats.unbound, '(should be low — only truly unbound cmds)');
// Pull the rendered key for a couple of known commands by scanning text near them.
const sample = await page.evaluate(() => {
  function keyFor(cmd){
    const els=[...document.querySelectorAll('*')].filter(e=>e.children.length===0 && e.textContent.trim()===cmd);
    if(!els.length) return null;
    // climb to the row and grab the first cell text
    let row=els[0]; for(let i=0;i<4&&row;i++){ row=row.parentElement; if(row && row.textContent.includes(cmd) && /[A-Za-z]/.test(row.textContent)) break; }
    return row ? row.textContent.replace(/\s+/g,' ').trim().slice(0,60) : null;
  }
  return { tabnext: keyFor('tab-next'), hint: keyFor('hint'), scrolldown: keyFor('scroll-down') };
});
log('sample rows:', JSON.stringify(sample));
await page.screenshot({ path: path.join(OUT, 'help-fixed.png'), fullPage: false });
log('screenshot help-fixed.png; pageerrors:', errs.length ? errs : 'none');
await browser.close(); log('done');
