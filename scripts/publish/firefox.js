/**
 * Publish the built zip to Firefox Add-ons (addons.mozilla.org) through the
 * official `web-ext` tool (listed channel: the add-on is queued for review).
 *
 * Usage: node scripts/publish/firefox.js [dist/adn-improver-vX.Y.Z.zip]
 *
 * Environment:
 *   AMO_JWT_ISSUER  API key issuer from https://addons.mozilla.org/developers/addon/api/key/
 *   AMO_JWT_SECRET  API key secret
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fail, log, readConfig, resolveZip } from './lib.js';

const WEB_EXT_VERSION = '8.3.0';

async function main() {
    const config = readConfig('Firefox Add-ons', ['AMO_JWT_ISSUER', 'AMO_JWT_SECRET']);
    if (!config) return;

    const zipPath = resolveZip(process.argv[2]);
    const sourceDir = path.resolve('dist/firefox-source');
    const artifactsDir = path.resolve('dist/firefox');
    fs.rmSync(sourceDir, { recursive: true, force: true });
    fs.mkdirSync(sourceDir, { recursive: true });
    log(`Firefox Add-ons: unpacking ${zipPath}`);
    run('unzip', ['-q', zipPath, '-d', sourceDir]);

    log('Submitting with web-ext sign (listed channel)…');
    run('npx', [
        '--yes',
        `web-ext@${WEB_EXT_VERSION}`,
        'sign',
        '--source-dir', sourceDir,
        '--artifacts-dir', artifactsDir,
        '--channel', 'listed',
        '--api-key', config.AMO_JWT_ISSUER,
        '--api-secret', config.AMO_JWT_SECRET,
    ]);
    log('Submitted to Firefox Add-ons (review pending).');
}

function run(command, args) {
    const result = spawnSync(command, args, { stdio: 'inherit' });
    if (result.status !== 0) throw new Error(`${command} exited with code ${result.status}`);
}

main().catch(fail);
