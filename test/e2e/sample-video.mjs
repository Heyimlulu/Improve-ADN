/**
 * Provides the test video. A committed `sample.webm` is used when present;
 * otherwise a 14 s clip is recorded with MediaRecorder in headless Chromium.
 */
import fs from 'node:fs';
import { chromium } from 'playwright';

export async function ensureSampleVideo(filePath) {
    if (fs.existsSync(filePath)) return filePath;

    const browser = await chromium.launch({ channel: 'chromium', headless: true });
    const page = await browser.newPage();
    await page.setContent('<canvas id="c" width="320" height="180"></canvas>');
    const base64 = await page.evaluate(async () => {
        const canvas = document.getElementById('c');
        const ctx = canvas.getContext('2d');
        const recorder = new MediaRecorder(canvas.captureStream(15), { mimeType: 'video/webm;codecs=vp8' });
        const chunks = [];
        recorder.ondataavailable = (event) => chunks.push(event.data);
        let frame = 0;
        const timer = setInterval(() => {
            frame++;
            ctx.fillStyle = `hsl(${(frame * 4) % 360} 70% 45%)`;
            ctx.fillRect(0, 0, 320, 180);
            ctx.fillStyle = '#fff';
            ctx.font = '40px sans-serif';
            ctx.fillText(String(frame), 120, 110);
        }, 66);
        recorder.start();
        await new Promise((resolve) => setTimeout(resolve, 14000));
        clearInterval(timer);
        const stopped = new Promise((resolve) => (recorder.onstop = resolve));
        recorder.stop();
        await stopped;
        const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
        let binary = '';
        for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        return btoa(binary);
    });
    await browser.close();
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
    return filePath;
}
