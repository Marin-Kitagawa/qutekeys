#!/usr/bin/env node
/**
 * scripts/package.mjs
 * Cross-browser packaging script — produces dist/qutesurf-chrome.zip and
 * dist/qutesurf-firefox.zip from dist/chrome and dist/firefox respectively.
 *
 * Uses archiver v8 (named-export API).
 */

import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { ZipArchive } = require('archiver');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

/**
 * Zip the contents of `sourceDir` (files placed at the archive root) and
 * write them to `outFile`.  Resolves with the total byte count.
 */
async function zipDir(sourceDir, outFile) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(sourceDir)) {
      reject(new Error(`Source directory not found: ${sourceDir}`));
      return;
    }

    const output = fs.createWriteStream(outFile);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on('close', () => {
      const bytes = archive.pointer();
      console.log(`  ${path.basename(outFile)}: ${(bytes / 1024).toFixed(1)} KB`);
      resolve(bytes);
    });

    archive.on('warning', (err) => {
      if (err.code !== 'ENOENT') throw err;
    });

    archive.on('error', reject);

    archive.pipe(output);

    // Add all files from sourceDir at the archive root (false = no prefix folder)
    archive.directory(sourceDir, false);

    archive.finalize();
  });
}

async function main() {
  console.log('Packaging QuteSurf extensions...');

  const targets = [
    { src: path.join(DIST, 'chrome'),  out: path.join(DIST, 'qutesurf-chrome.zip') },
    { src: path.join(DIST, 'firefox'), out: path.join(DIST, 'qutesurf-firefox.zip') },
  ];

  for (const { src, out } of targets) {
    await zipDir(src, out);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error('Packaging failed:', err.message);
  process.exit(1);
});
