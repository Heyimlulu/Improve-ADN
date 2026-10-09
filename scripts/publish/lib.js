/**
 * Small helpers shared by the store publishing scripts.
 */

import fs from 'node:fs';
import path from 'node:path';

/** Read the required environment variables, or return null (with a notice) when none is set. */
export function readConfig(storeName, names) {
    const values = Object.fromEntries(names.map((name) => [name, process.env[name]?.trim() || '']));
    const missing = names.filter((name) => !values[name]);
    if (missing.length === names.length) {
        notice(`${storeName}: skipped, no credentials configured (${names.join(', ')}).`);
        return null;
    }
    if (missing.length > 0) {
        throw new Error(`${storeName}: missing environment variables: ${missing.join(', ')}`);
    }
    return values;
}

/** Resolve the zip to publish: explicit argument, or the single zip in dist/. */
export function resolveZip(argument) {
    if (argument) {
        if (!fs.existsSync(argument)) throw new Error(`Zip not found: ${argument}`);
        return path.resolve(argument);
    }
    const dist = path.resolve('dist');
    const zips = fs.existsSync(dist) ? fs.readdirSync(dist).filter((file) => file.endsWith('.zip')) : [];
    if (zips.length !== 1) {
        throw new Error(`Expected exactly one zip in dist/ (found ${zips.length}); pass the path as argument or run "npm run build".`);
    }
    return path.join(dist, zips[0]);
}

export async function requestJson(url, options = {}) {
    const response = await fetch(url, options);
    const text = await response.text();
    let body;
    try {
        body = text ? JSON.parse(text) : null;
    } catch {
        body = text;
    }
    if (!response.ok) {
        throw new Error(`${options.method ?? 'GET'} ${url} -> HTTP ${response.status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
    }
    return { response, body };
}

/** Call `check` every `intervalMs` until it returns a truthy value or `timeoutMs` elapses. */
export async function poll(description, check, { intervalMs = 10_000, timeoutMs = 15 * 60_000 } = {}) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        const result = await check();
        if (result) return result;
        if (Date.now() > deadline) throw new Error(`Timed out while waiting for ${description}`);
        log(`Waiting for ${description}…`);
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
}

export function log(message) {
    console.log(`[publish] ${message}`);
}

export function notice(message) {
    // GitHub Actions renders ::notice:: as an annotation; harmless elsewhere.
    console.log(process.env.GITHUB_ACTIONS ? `::notice::${message}` : `[publish] ${message}`);
}

export function fail(error) {
    console.error(process.env.GITHUB_ACTIONS ? `::error::${error.message}` : `[publish] ${error.message}`);
    process.exit(1);
}
