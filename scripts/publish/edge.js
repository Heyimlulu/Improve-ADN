/**
 * Publish the built zip to Microsoft Edge Add-ons (upload a draft package,
 * then submit it for certification).
 *
 * Usage: node scripts/publish/edge.js [dist/adn-improver-vX.Y.Z.zip]
 *
 * Environment:
 *   EDGE_PRODUCT_ID  product id from Partner Center
 *   EDGE_CLIENT_ID   client id of the Publish API credentials
 *   EDGE_API_KEY     API key of the Publish API credentials
 *
 * See README.md ("Publishing") for how to obtain them.
 */

import fs from 'node:fs';
import { fail, log, poll, readConfig, requestJson, resolveZip } from './lib.js';

const API = 'https://api.addons.microsoftedge.microsoft.com/v1/products';

async function main() {
    const config = readConfig('Edge Add-ons', ['EDGE_PRODUCT_ID', 'EDGE_CLIENT_ID', 'EDGE_API_KEY']);
    if (!config) return;

    const zipPath = resolveZip(process.argv[2]);
    log(`Edge Add-ons: publishing ${zipPath}`);

    const base = `${API}/${config.EDGE_PRODUCT_ID}/submissions`;
    const headers = { Authorization: `ApiKey ${config.EDGE_API_KEY}`, 'X-ClientID': config.EDGE_CLIENT_ID };

    const { response: uploadResponse } = await requestJson(`${base}/draft/package`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/zip' },
        body: fs.readFileSync(zipPath),
    });
    const uploadOperation = uploadResponse.headers.get('location');
    if (!uploadOperation) throw new Error('Upload accepted but no operation id returned');
    await poll('package upload', async () => {
        const { body } = await requestJson(`${base}/draft/package/operations/${uploadOperation}`, { headers });
        if (body.status === 'Failed') throw new Error(`Upload failed: ${body.message ?? JSON.stringify(body.errors)}`);
        return body.status === 'Succeeded';
    });
    log('Package accepted.');

    const { response: submitResponse } = await requestJson(base, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Automated submission from GitHub Actions.' }),
    });
    const submitOperation = submitResponse.headers.get('location');
    if (!submitOperation) throw new Error('Submission accepted but no operation id returned');
    await poll('submission', async () => {
        const { body } = await requestJson(`${base}/operations/${submitOperation}`, { headers });
        if (body.status === 'Failed') throw new Error(`Submission failed: ${body.message ?? JSON.stringify(body.errors)}`);
        return body.status === 'Succeeded';
    });
    log('Submitted to Edge Add-ons (certification pending).');
}

main().catch(fail);
