/**
 * Publish the built zip to the Chrome Web Store (upload + submit for review).
 *
 * Usage: node scripts/publish/chrome.js [dist/adn-improver-vX.Y.Z.zip]
 *
 * Environment:
 *   CHROME_EXTENSION_ID   id of the item in the Chrome Web Store
 *   CHROME_CLIENT_ID      OAuth client id (Google Cloud, "Desktop app")
 *   CHROME_CLIENT_SECRET  OAuth client secret
 *   CHROME_REFRESH_TOKEN  refresh token with the chromewebstore scope
 *
 * See README.md ("Publishing") for how to obtain them.
 */

import fs from 'node:fs';
import { fail, log, readConfig, requestJson, resolveZip } from './lib.js';

const API = 'https://www.googleapis.com';

async function main() {
    const config = readConfig('Chrome Web Store', [
        'CHROME_EXTENSION_ID',
        'CHROME_CLIENT_ID',
        'CHROME_CLIENT_SECRET',
        'CHROME_REFRESH_TOKEN',
    ]);
    if (!config) return;

    const zipPath = resolveZip(process.argv[2]);
    log(`Chrome Web Store: publishing ${zipPath}`);

    const { body: token } = await requestJson('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: config.CHROME_CLIENT_ID,
            client_secret: config.CHROME_CLIENT_SECRET,
            refresh_token: config.CHROME_REFRESH_TOKEN,
            grant_type: 'refresh_token',
        }),
    });
    const headers = { Authorization: `Bearer ${token.access_token}`, 'x-goog-api-version': '2' };

    const { body: upload } = await requestJson(`${API}/upload/chromewebstore/v1.1/items/${config.CHROME_EXTENSION_ID}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/zip' },
        body: fs.readFileSync(zipPath),
    });
    if (upload.uploadState !== 'SUCCESS') {
        throw new Error(`Upload failed: ${JSON.stringify(upload.itemError ?? upload)}`);
    }
    log('Upload accepted.');

    const { body: publish } = await requestJson(
        `${API}/chromewebstore/v1.1/items/${config.CHROME_EXTENSION_ID}/publish?publishTarget=default`,
        { method: 'POST', headers: { ...headers, 'Content-Length': '0' } },
    );
    log(`Publish status: ${(publish.status ?? []).join(', ')} ${(publish.statusDetail ?? []).join(' ')}`);
    const ok = (publish.status ?? []).every((status) => ['OK', 'ITEM_PENDING_REVIEW'].includes(status));
    if (!ok) throw new Error(`Publish failed: ${JSON.stringify(publish)}`);
    log('Submitted to the Chrome Web Store (review pending).');
}

main().catch(fail);
