// Serve a file through route.fulfill with HTTP Range support so Chromium treats the media as seekable.
export function fulfillMedia(route, body, contentType) {
    const range = route.request().headers()['range'];
    const headers = { 'Accept-Ranges': 'bytes', 'Content-Type': contentType };
    if (range) {
        const [, startText, endText] = range.match(/bytes=(\d*)-(\d*)/) ?? [];
        const start = startText ? Number(startText) : 0;
        const end = endText ? Math.min(Number(endText), body.length - 1) : body.length - 1;
        return route.fulfill({
            status: 206,
            headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${body.length}`, 'Content-Length': String(end - start + 1) },
            body: body.subarray(start, end + 1),
        });
    }
    return route.fulfill({ status: 200, headers: { ...headers, 'Content-Length': String(body.length) }, body });
}
