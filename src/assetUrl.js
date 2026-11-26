// A picture or sound of public/ (/assets/…, /cards/…) with its folder's fingerprint (scripts/assetVersions.js):
// /assets/ciclos/clouds.webp -> /assets/ciclos/clouds.webp?v=Xk3…. Every place that loads one asks this, so the
// service worker can keep it for good and never ask the server again until a deploy changes it (vite.config.js).
// Anything else (an address with its own query, a folder with no fingerprint, development) comes back as it is.
import versions from 'virtual:asset-versions';

export const assetUrl = (url) => {
    if (typeof url !== 'string' || url[0] !== '/' || url.includes('?')) return url;
    const v = versions[url.slice(1, url.lastIndexOf('/'))];
    return v ? `${url}?v=${v}` : url;
};
