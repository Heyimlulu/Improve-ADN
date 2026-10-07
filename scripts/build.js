/**
 * Packages the extension into `dist/adn-improver-v<version>.zip`.
 * Only the files the browser needs are included (no scripts, docs or configs).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = path.join(ROOT, 'dist');

/** Directories and files shipped in the archive (relative to the repo root). */
const INCLUDED_DIRECTORIES = ['_locales', 'content', 'icons', 'popup', 'shared'];
const INCLUDED_FILES = ['manifest.json', 'LICENSE'];

function readManifest() {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
    for (const field of ['name', 'version', 'manifest_version']) {
        if (!manifest[field]) throw new Error(`manifest.json is missing "${field}"`);
    }
    return manifest;
}

function assertExists(relativePath) {
    if (!fs.existsSync(path.join(ROOT, relativePath))) {
        throw new Error(`Required path missing: ${relativePath}`);
    }
}

async function build() {
    const manifest = readManifest();
    for (const entry of [...INCLUDED_DIRECTORIES, ...INCLUDED_FILES]) assertExists(entry);

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const outputPath = path.join(OUTPUT_DIR, `adn-improver-v${manifest.version}.zip`);

    await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', resolve);
        archive.on('warning', (error) => (error.code === 'ENOENT' ? console.warn(error.message) : reject(error)));
        archive.on('error', reject);
        archive.pipe(output);

        for (const directory of INCLUDED_DIRECTORIES) {
            archive.directory(path.join(ROOT, directory), directory);
        }
        for (const file of INCLUDED_FILES) {
            archive.file(path.join(ROOT, file), { name: file });
        }
        archive.finalize();
    });

    const sizeKb = (fs.statSync(outputPath).size / 1024).toFixed(1);
    console.log(`Built ${path.relative(ROOT, outputPath)} (${sizeKb} kB) for version ${manifest.version}`);
}

build().catch((error) => {
    console.error(`Build failed: ${error.message}`);
    process.exit(1);
});
