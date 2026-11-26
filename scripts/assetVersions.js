// The pictures and sounds in public/ keep their names when they change (a scene's layers, a card's illustration), so
// without help a browser has to ask the server about each of them on every visit ("did it change?") and the service
// worker waits for that answer. This plugin gives each folder of them a short fingerprint of its contents, built into
// the app as `virtual:asset-versions` ({ 'assets/ciclos': 'Xk3…', ... }); src/assetUrl.js adds it to every address
// (/assets/ciclos/clouds.webp?v=Xk3…), so an address never changes its contents and the service worker can keep it
// for good (vite.config.js). One fingerprint per folder, not per file: the list stays under a kilobyte in the app's
// main chunk, and a scene whose pictures change is downloaded again whole (they usually change together).
// In development (vite dev) the list is empty and every address stays as it is.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ID = 'virtual:asset-versions';
const ROOTS = ['assets', 'cards'];
// Kept by the service worker's own precache, with its own revisions (vite.config.js): no fingerprint needed
const SKIP = new Set(['cards/thumb']);
const FILES = /\.(webp|jpg|png|mp3)$/;

const versions = (publicDir) => {
    const out = {};
    const walk = (dir) => {
        const entries = fs.readdirSync(path.join(publicDir, dir), { withFileTypes: true })
            .sort((a, b) => a.name.localeCompare(b.name));
        const hash = crypto.createHash('sha1');
        let files = 0;
        for (const entry of entries) {
            const rel = `${dir}/${entry.name}`;
            if (entry.isDirectory()) walk(rel);
            else if (FILES.test(entry.name)) {
                hash.update(entry.name).update(fs.readFileSync(path.join(publicDir, rel)));
                files++;
            }
        }
        if (files && !SKIP.has(dir)) out[dir] = hash.digest('base64url').slice(0, 8);
    };
    ROOTS.forEach((root) => { if (fs.existsSync(path.join(publicDir, root))) walk(root); });
    return out;
};

export default function assetVersions() {
    let config;
    return {
        name: 'asset-versions',
        configResolved(resolved) { config = resolved; },
        resolveId(id) { return id === ID ? '\0' + ID : null; },
        load(id) {
            if (id !== '\0' + ID) return null;
            const list = config.command === 'build' ? versions(config.publicDir) : {};
            return `export default ${JSON.stringify(list)};`;
        },
    };
}
