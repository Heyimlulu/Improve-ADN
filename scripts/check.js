/**
 * Static sanity checks that do not need a browser:
 *  - every JavaScript file parses
 *  - every file referenced by manifest.json exists
 *  - every i18n key used in the code exists in every locale
 *  - every setting of the schema has its labels translated
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIRECTORIES = ['content', 'popup', 'shared'];
const errors = [];

function listFiles(directory, extension) {
    const absolute = path.join(ROOT, directory);
    if (!fs.existsSync(absolute)) return [];
    return fs.readdirSync(absolute, { withFileTypes: true, recursive: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
        .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name));
}

// 1. Manifest references.
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const referenced = new Set([
    ...Object.values(manifest.icons ?? {}),
    ...Object.values(manifest.action?.default_icon ?? {}),
    manifest.action?.default_popup,
    ...manifest.content_scripts.flatMap((script) => [...script.js, ...(script.css ?? [])]),
]);
for (const file of referenced) {
    if (file && !fs.existsSync(path.join(ROOT, file))) errors.push(`manifest.json references a missing file: ${file}`);
}
if (!fs.existsSync(path.join(ROOT, '_locales', manifest.default_locale, 'messages.json'))) {
    errors.push(`default_locale "${manifest.default_locale}" has no messages.json`);
}

// 2. JavaScript parses (package.json has "type": "module", so node parses ESM).
for (const file of SOURCE_DIRECTORIES.flatMap((directory) => listFiles(directory, '.js'))) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) {
        errors.push(`${path.relative(ROOT, file)}: ${result.stderr.trim().split('\n').slice(-1)[0]}`);
    }
}

// 3. i18n keys.
const locales = fs.readdirSync(path.join(ROOT, '_locales')).map((locale) => ({
    locale,
    messages: JSON.parse(fs.readFileSync(path.join(ROOT, '_locales', locale, 'messages.json'), 'utf8')),
}));

const usedKeys = new Set();
for (const file of SOURCE_DIRECTORIES.flatMap((directory) => [...listFiles(directory, '.js'), ...listFiles(directory, '.html')])) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/\bt\(\s*'([A-Za-z0-9_]+)'/g)) usedKeys.add(match[1]);
    for (const match of source.matchAll(/data-i18n="([A-Za-z0-9_]+)"/g)) usedKeys.add(match[1]);
    for (const match of source.matchAll(/data-i18n-attr="([^"]+)"/g)) {
        for (const pair of match[1].split(',')) usedKeys.add(pair.split(':')[1].trim());
    }
}

const schemaModule = await import(pathToFileURL(path.join(ROOT, 'shared/settings-schema.js')));
for (const entry of schemaModule.SETTINGS_SCHEMA) {
    usedKeys.add(entry.label);
    usedKeys.add(entry.description);
}
for (const key of schemaModule.ALWAYS_ON_FEATURES) usedKeys.add(key);
const shortcutsModule = await import(pathToFileURL(path.join(ROOT, 'shared/shortcuts.js')));
for (const shortcut of shortcutsModule.SHORTCUTS) usedKeys.add(shortcut.label);

for (const { locale, messages } of locales) {
    for (const key of usedKeys) {
        if (!messages[key]?.message) errors.push(`_locales/${locale}: missing message "${key}"`);
    }
}

if (errors.length > 0) {
    console.error(`${errors.length} problem(s) found:\n- ${errors.join('\n- ')}`);
    process.exit(1);
}
console.log(`All checks passed (${usedKeys.size} i18n keys, ${locales.length} locales).`);
