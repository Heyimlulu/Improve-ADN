/**
 * Loader.
 *
 * Manifest V3 content scripts cannot be ES modules, so this classic script
 * dynamically imports the real entry point. The modules are exposed through
 * `web_accessible_resources` in the manifest.
 */
(() => {
    if (globalThis.__adnImproverLoaded) return;
    globalThis.__adnImproverLoaded = true;

    import(chrome.runtime.getURL('content/main.js')).catch((error) => {
        console.error('[ADN Improver] Unable to load the extension modules.', error);
    });
})();
