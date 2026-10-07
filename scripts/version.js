/**
 * Bumps the version in package.json and manifest.json.
 * Usage: node scripts/version.js <patch|minor|major>
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import semver from 'semver';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const releaseType = process.argv[2];

if (!['patch', 'minor', 'major'].includes(releaseType)) {
    console.error('Usage: node scripts/version.js <patch|minor|major>');
    process.exit(1);
}

function updateJson(fileName, update) {
    const filePath = path.join(ROOT, fileName);
    const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    update(json);
    fs.writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const newVersion = semver.inc(packageJson.version, releaseType);

updateJson('package.json', (json) => {
    json.version = newVersion;
});
updateJson('manifest.json', (json) => {
    json.version = newVersion;
});

console.log(`Version bumped from ${packageJson.version} to ${newVersion}.`);
