const fs = require('fs');
const semver = require('semver');

const releaseType = process.argv[2];

if (!['patch', 'minor', 'major'].includes(releaseType)) {
    console.error('Invalid release type. Use patch, minor, or major.');
    process.exit(1);
}

// Update package.json
const packageJsonPath = './package.json';
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const oldVersion = packageJson.version;
const newVersion = semver.inc(oldVersion, releaseType);
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

// Update manifest.json
const manifestPath = './manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.version = newVersion;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log(`Version bumped from ${oldVersion} to ${newVersion}.`);
