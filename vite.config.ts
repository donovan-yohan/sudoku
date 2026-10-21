import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { defineConfig } from 'vitest/config'
import type { Plugin, ResolvedConfig } from 'vite'
import react from '@vitejs/plugin-react'

// No runtime dependency: version and precache come from the final emitted bytes.
function offlineShell(): Plugin {
  let config: ResolvedConfig
  return {
    name: 'sudoku-offline-shell',
    apply: 'build',
    configResolved(resolved) { config = resolved },
    generateBundle: {
      order: 'post',
      async handler(_options, bundle) {
        const files = new Map<string, string | Uint8Array>()
        for (const [name, output] of Object.entries(bundle)) {
          files.set(`/${name}`, output.type === 'chunk' ? output.code : output.source)
        }
        async function addPublic(directory: string): Promise<void> {
          for (const entry of await readdir(directory, { withFileTypes: true })) {
            const path = join(directory, entry.name)
            if (entry.isDirectory()) await addPublic(path)
            else if (entry.isFile()) files.set(`/${relative(config.publicDir, path).replaceAll('\\', '/')}`, await readFile(path))
          }
        }
        await addPublic(config.publicDir)
        const paths = [...files.keys()].sort()
        const hash = createHash('sha256')
        for (const path of paths) hash.update(path).update('\0').update(files.get(path)!).update('\0')
        const worker = `// Generated from the complete production shell; do not edit.
const PREFIX = 'sudoku-shell-v1-';
const VERSION = '__SUDOKU_SHELL_VERSION__';
const CACHE = PREFIX + VERSION;
const PRECACHE = ${JSON.stringify(paths)};
const URLS = new Set(PRECACHE);
async function validateShellResponse(path, response) {
  const extension = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  const mediaTypes = {
    html: ['text/html'],
    css: ['text/css'],
    js: ['text/javascript', 'application/javascript'],
    mjs: ['text/javascript', 'application/javascript'],
    json: ['application/json'],
    webmanifest: ['application/manifest+json', 'application/json'],
    svg: ['image/svg+xml'],
    png: ['image/png'],
    wasm: ['application/wasm'],
  };
  const type = (response.headers.get('content-type') || '').split(';', 1)[0].trim().toLowerCase();
  if (response.status !== 200 || response.redirected || !mediaTypes[extension]?.includes(type)) {
    throw new Error('Invalid offline shell response: ' + path);
  }
  // Inspect once, only at install time; keep the original stream for cache.put.
  if ((await response.clone().arrayBuffer()).byteLength === 0) {
    throw new Error('Empty offline shell response: ' + path);
  }
}
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      // Stage and validate every response before committing any cache entries.
      const responses = await Promise.all(PRECACHE.map(async path => {
        const response = await fetch(new Request(path, {cache: 'reload'}));
        await validateShellResponse(path, response);
        return response;
      }));
      await Promise.all(PRECACHE.map((path, index) => cache.put(path, responses[index])));
    } catch (error) {
      await caches.delete(CACHE);
      throw error;
    }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) return response;
      } catch { /* Fall through to the exact installed shell. */ }
      const response = await caches.match('/index.html', {cacheName: CACHE});
      return response || Response.error();
    })());
  } else if (URLS.has(url.pathname)) {
    event.respondWith((async () => {
      const response = await caches.match(url.pathname, {cacheName: CACHE});
      return response || fetch(request);
    })());
  }
});
`
        // Include worker behavior too, so changing cache policy gets a new version.
        const version = hash.update(worker).digest('hex')
        this.emitFile({ type: 'asset', fileName: 'sw.js', source: worker.replace('__SUDOKU_SHELL_VERSION__', version) })
      },
    },
  }
}

export default defineConfig({ plugins: [react(), offlineShell()], test: { include: ['src/**/*.test.ts'], maxWorkers:2 } })
