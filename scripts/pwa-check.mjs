// Builds and serves a disposable production copy; never writes this checkout's dist/cache.
// Run: npm run test:pwa (optional SUDOKU_PWA_DIR selects the evidence directory).
import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, readFile, readdir, writeFile, symlink } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { build, preview } from 'vite'
import { chromium } from '@playwright/test'
import { createHash } from 'node:crypto'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const base = process.env.SUDOKU_PWA_DIR || join(tmpdir(), 'sudoku-pwa')
await mkdir(base, { recursive: true })
const out = await mkdtemp(join(base, 'check-'))
const root = join(out, 'project')
await mkdir(root)
for (const name of ['src', 'public', 'index.html', 'vite.config.ts', 'tsconfig.json', 'package.json']) {
  await cp(join(repo, name), join(root, name), { recursive: true })
}
await symlink(join(repo, 'node_modules'), join(root, 'node_modules'), 'dir')
await build({ root, configLoader: 'runner', cacheDir: join(out, 'vite-cache') })
const html = await readFile(join(root, 'dist/index.html'), 'utf8')
const built = await readdir(join(root, 'dist'))
// Keep these independent so the initial RED identifies both missing PWA seams.
const missing = []
if (!/<link[^>]+rel="manifest"/.test(html)) missing.push('production HTML has no manifest link')
if (!built.includes('sw.js')) missing.push('production build has no service worker')
assert.deepEqual(missing, [], 'installable offline shell is missing')

async function poll(check, message) {
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    if (await check()) return
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  assert.fail(message)
}

let server
let browser
const results = { output: out }
let failureProbe = null
const probeRequests = []
const failureCases = [
  { name: '503 icon', target: 'icon', status: 503, type: 'text/plain', body: 'Intentional precache failure' },
  { name: 'HTML masquerading as icon', target: 'icon', status: 200, type: 'text/html', body: '<!doctype html><title>Not an icon</title>' },
  { name: 'mixed-case HTML masquerading as icon', target: 'icon', status: 200, type: 'Text/Html; charset=utf-8', body: '<!doctype html><title>Not an icon</title>' },
  { name: 'empty 204 script', target: 'script', status: 204, type: 'application/javascript', body: '' },
  { name: 'wrong-type 200 script', target: 'script', status: 200, type: 'text/plain', body: '/* A nonempty response is not enough. */' },
  { name: 'empty 200 script', target: 'script', status: 200, type: 'text/javascript', body: '' },
]
const failures = []
// Observe the real worker lifecycle, including a broken worker reaching waiting.
async function observeRejectedWorker(page, update = false) {
  return page.evaluate(async update => {
    const registration = update
      ? await navigator.serviceWorker.getRegistration()
      : await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
    let worker
    if (update) {
      const found = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Update did not produce an installing worker')), 10000)
        registration.addEventListener('updatefound', () => { clearTimeout(timeout); resolve(registration.installing) }, { once: true })
      })
      await registration.update()
      worker = await found
    } else worker = registration.installing || registration.waiting || registration.active
    if (worker && !['redundant', 'installed', 'activated'].includes(worker.state)) {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Precache did not settle')), 10000)
        worker.addEventListener('statechange', () => {
          if (['redundant', 'installed', 'activated'].includes(worker.state)) { clearTimeout(timeout); resolve() }
        })
      })
    }
    return { state: worker?.state, caches: await caches.keys(), controlled: Boolean(navigator.serviceWorker.controller), activeState: registration.active?.state, waiting: Boolean(registration.waiting) }
  }, update)
}
async function cacheSnapshot(page, key) {
  return page.evaluate(async key => {
    const cache = await caches.open(key)
    return Promise.all((await cache.keys()).map(async request => {
      const response = await cache.match(request)
      const digest = await crypto.subtle.digest('SHA-256', await response.arrayBuffer())
      return { path: new URL(request.url).pathname, status: response.status, type: response.headers.get('content-type'), sha256: Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('') }
    }))
  }, key)
}
function checkRejection(kind, failure, state, assertions) {
  try { assertions(); return { failure: failure.name, ...state, passed: true } }
  catch (error) {
    failures.push(`${kind}: ${failure.name}: ${error.message}`)
    return { failure: failure.name, ...state, passed: false, error: error.message }
  }
}
const security = JSON.parse(await readFile(join(repo, 'vercel.json'), 'utf8')).headers.find(rule => rule.source === '/(.*)').headers
try {
  server = await preview({
    root, configLoader: 'runner', preview: { host: '127.0.0.1', port: 0 },
    plugins: [{ name: 'pwa-failure-probe', configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        for (const { key, value } of security) response.setHeader(key, value)
        const path = request.url?.split('?')[0]
        // Only poison worker fetches, not the online document's module request.
        const target = failureProbe?.target === 'icon' ? path === '/icons/icon-512.png' : /^\/assets\/.*\.js$/.test(path)
        if (failureProbe && target && request.headers['sec-fetch-dest'] === 'empty') {
          probeRequests.push({ failure: failureProbe.name, path, status: failureProbe.status, type: failureProbe.type })
          response.writeHead(failureProbe.status, { 'Content-Type': failureProbe.type, 'Cache-Control': 'no-store' })
          response.end(failureProbe.body)
        } else next()
      })
    } }],
  })
  const address = server.httpServer.address()
  assert(address && typeof address !== 'string')
  const origin = `http://127.0.0.1:${address.port}`
  const manifestResponse = await fetch(`${origin}/manifest.webmanifest`)
  assert.match(manifestResponse.headers.get('content-type'), /application\/manifest\+json/)
  const manifest = await manifestResponse.json()
  assert.equal(manifest.name, 'Sudoku')
  assert.equal(manifest.short_name, 'Sudoku')
  assert.equal(manifest.display, 'standalone')
  for (const key of ['id', 'start_url', 'scope']) assert.equal(manifest[key], '/')
  for (const size of [192, 512]) {
    assert(manifest.icons.some(icon => icon.sizes === `${size}x${size}` && icon.type === 'image/png' && icon.purpose.split(' ').includes('maskable')))
  }
  assert(manifest.icons.some(icon => icon.type === 'image/svg+xml'))
  assert.match(html, /rel="apple-touch-icon"/)
  const original = await readFile(join(repo, 'index.html'), 'utf8')
  const bootstrap = html.match(/<script>(.*?)<\/script>/s)?.[1]
  assert.equal(bootstrap, original.match(/<script>(.*?)<\/script>/s)?.[1], 'theme bootstrap bytes preserved')
  const bootstrapHash = `sha256-${createHash('sha256').update(bootstrap).digest('base64')}`
  assert(security.find(header => header.key === 'Content-Security-Policy').value.includes(bootstrapHash))
  results.themeBootstrapCspHash = bootstrapHash
  results.icons = []
  for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
    const bytes = await readFile(join(root, 'dist/icons', name))
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG')
    assert.equal(bytes.readUInt32BE(16), size)
    assert.equal(bytes.readUInt32BE(20), size)
    results.icons.push({ name, width: size, height: size })
  }
  browser = await chromium.launch()
  const context = await browser.newContext({ colorScheme: 'dark' })
  const page = await context.newPage()
  const errors = [], external = []
  page.on('pageerror', error => errors.push(error.message))
  context.on('request', request => { if (!request.url().startsWith(origin)) external.push(request.url()) })
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
  // On this fresh profile there are no pre-existing workers, caches or saves.
  await context.addInitScript(() => {
    window.__pwaCspViolations = []
    document.addEventListener('securitypolicyviolation', event => window.__pwaCspViolations.push({ directive: event.effectiveDirective, blocked: event.blockedURI }))
    window.__pwaFirstVisit ??= Promise.all([caches.keys(), navigator.serviceWorker.getRegistrations()]).then(([keys, registrations]) => ({ keys, registrations: registrations.length }))
    if (!localStorage.getItem('sudoku-theme')) {
      localStorage.setItem('sudoku-theme', 'light')
      localStorage.setItem('sudoku-effects', 'off')
    }
  })
  const firstResponse = await page.goto(origin)
  const csp = security.find(header => header.key === 'Content-Security-Policy').value
  assert.equal(firstResponse.headers()['content-security-policy'], csp, 'normal navigation retains the exact production CSP')
  assert(!csp.includes("'unsafe-eval'") && !csp.match(/script-src[^;]*'unsafe-inline'/))
  await page.waitForSelector('[role=gridcell]')
  assert.deepEqual(await page.evaluate(() => window.__pwaFirstVisit), { keys: [], registrations: 0 })
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.waitForFunction(() => navigator.serviceWorker.controller)
  const appManifest = await cdp.send('Page.getAppManifest')
  assert.deepEqual(appManifest.errors, [], 'Chromium accepts the linked manifest')
  const installability = await cdp.send('Page.getInstallabilityErrors')
  assert.deepEqual(installability.installabilityErrors, [], 'Chromium considers the production app installable')
  results.chromiumInstallabilityErrors = installability.installabilityErrors
  const cacheState = await page.evaluate(async () => {
    const keys = await caches.keys()
    const entries = await Promise.all(keys.map(async key => ({ key, urls: (await (await caches.open(key)).keys()).map(request => new URL(request.url).pathname).sort() })))
    return entries
  })
  assert.equal(cacheState.length, 1)
  const assets = (await readdir(join(root, 'dist/assets'))).map(name => `/assets/${name}`)
  const required = ['/index.html', '/manifest.webmanifest', '/favicon.svg', ...manifest.icons.map(icon => icon.src), '/icons/apple-touch-icon.png', ...assets]
  for (const url of required) assert(cacheState[0].urls.includes(url), `first install must precache ${url}`)
  const worker = await (await fetch(`${origin}/sw.js`)).text()
  const precache = JSON.parse(worker.match(/const PRECACHE = (\[.*?\]);/)?.[1])
  assert.deepEqual(precache, cacheState[0].urls, 'cache contains the entire emitted precache list')
  const shellHash = createHash('sha256')
  for (const path of precache) shellHash.update(path).update('\0').update(await readFile(join(root, 'dist', path))).update('\0')
  const normalizedWorker = worker.replace(/const VERSION = '[a-f0-9]+';/, "const VERSION = '__SUDOKU_SHELL_VERSION__';")
  assert.equal(cacheState[0].key, `sudoku-shell-v1-${shellHash.update(normalizedWorker).digest('hex')}`, 'cache version is derived from exact emitted bytes and worker policy')
  assert(!worker.includes('skipWaiting'), 'updates must not interrupt a puzzle')
  const firstCspViolations = await page.evaluate(() => window.__pwaCspViolations)
  assert.deepEqual(firstCspViolations, [])
  results.security = { contentSecurityPolicy: csp, firstVisitViolations: firstCspViolations }
  results.install = { freshProfile: true, httpCacheDisabledBeforeFirstVisit: true, cacheState, assets }
  // Write a real candidate note through the board, not a synthetic game record.
  const cell = page.locator('[role=gridcell][aria-readonly=false]').first()
  const cellIndex = await cell.getAttribute('data-cell')
  await cell.click()
  await cell.press('n')
  await cell.press('1')
  await page.waitForFunction(() => Object.keys(localStorage).some(key => key.startsWith('sudoku-game-v2:') && JSON.parse(localStorage.getItem(key)).notes.some(notes => notes.includes(1))))
  const prior = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith('sudoku-'))))
  await cdp.send('Network.clearBrowserCache')
  await context.setOffline(true)
  // Unique navigation proves this did not merely reuse the original navigation response.
  await page.goto(`${origin}/offline-first-install?nonce=${Date.now()}`)
  await page.waitForSelector('[role=gridcell]')
  assert.match(await page.locator(`[data-cell="${cellIndex}"]`).getAttribute('aria-label'), /notes 1/)
  async function checkTheme(theme) {
    const actual = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, background: getComputedStyle(document.documentElement).backgroundColor, color: getComputedStyle(document.documentElement).color, stored: localStorage.getItem('sudoku-theme') }))
    assert.deepEqual(actual, { theme, background: theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)', color: theme === 'light' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)', stored: theme })
    return actual
  }
  results.lightOffline = await checkTheme('light')
  await page.reload()
  await page.waitForSelector('[role=gridcell]')
  assert.match(await page.locator(`[data-cell="${cellIndex}"]`).getAttribute('aria-label'), /notes 1/)
  const after = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith('sudoku-'))))
  for (const [key, value] of Object.entries(prior)) {
    if (key.startsWith('sudoku-game-v2:')) {
      const beforeGame = JSON.parse(value), afterGame = JSON.parse(after[key])
      assert.deepEqual(afterGame.values, beforeGame.values)
      assert.deepEqual(afterGame.notes, beforeGame.notes)
      assert.equal(afterGame.puzzleId, beforeGame.puzzleId)
    } else assert.equal(after[key], value)
  }
  // Existing preference key is intentionally retained; no UI-specific settings hook.
  await page.evaluate(() => localStorage.setItem('sudoku-theme', 'dark'))
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto(`${origin}/offline-dark?nonce=${Date.now()}`)
  await page.waitForSelector('[role=gridcell]')
  results.darkOffline = await checkTheme('dark')
  assert.equal(await page.evaluate(() => localStorage.getItem('sudoku-effects')), 'off')
  assert.match(await page.locator(`[data-cell="${cellIndex}"]`).getAttribute('aria-label'), /notes 1/)
  assert.deepEqual(errors, [])
  assert.deepEqual(external, [])
  results.offline = { uniqueNavigation: true, reload: true, notesPersist: true, preferencesPersist: true, errors, external }
  await context.close()
  // Exercise an actual changed shell: the new version waits while a puzzle is
  // open, then cleans only its own older caches after the last tab closes.
  const updateContext = await browser.newContext()
  const updatePage = await updateContext.newPage()
  await updatePage.goto(origin)
  await updatePage.waitForSelector('[role=gridcell]')
  await updatePage.evaluate(() => navigator.serviceWorker.ready)
  await updatePage.waitForFunction(() => navigator.serviceWorker.controller)
  const oldCache = await updatePage.evaluate(async () => (await caches.keys()).find(key => key.startsWith('sudoku-shell-v1-')))
  await updatePage.evaluate(async () => { await caches.open('another-app-keep'); await caches.open('sudoku-shell-v1-obsolete') })
  const manifestPath = join(root, 'public/manifest.webmanifest')
  await writeFile(manifestPath, `${await readFile(manifestPath, 'utf8')}\n`)
  await build({ root, configLoader: 'runner', cacheDir: join(out, 'vite-cache') })
  await updatePage.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration()
    await registration.update()
  })
  await poll(() => updatePage.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting)), 'Updated worker never reached waiting')
  const waiting = await updatePage.evaluate(async () => ({ controlled: Boolean(navigator.serviceWorker.controller), keys: await caches.keys(), count: document.querySelectorAll('[role=gridcell]').length }))
  assert.equal(waiting.count, 81)
  assert(waiting.keys.includes(oldCache), 'old running puzzle retains its complete shell')
  assert.equal(waiting.keys.filter(key => key.startsWith('sudoku-shell-v1-') && key !== 'sudoku-shell-v1-obsolete').length, 2)
  await updatePage.close()
  const activatedPage = await updateContext.newPage()
  await activatedPage.goto(origin)
  await activatedPage.waitForSelector('[role=gridcell]')
  await poll(() => activatedPage.evaluate(async previous => {
    const keys = await caches.keys()
    return !keys.includes(previous) && !keys.includes('sudoku-shell-v1-obsolete') && keys.filter(key => key.startsWith('sudoku-shell-v1-')).length === 1
  }, oldCache), 'Activation did not finish cleaning old shell caches')
  const updatedKeys = await activatedPage.evaluate(() => caches.keys())
  assert(updatedKeys.includes('another-app-keep'))
  assert(!updatedKeys.includes(oldCache))
  assert.equal(updatedKeys.filter(key => key.startsWith('sudoku-shell-v1-')).length, 1)
  results.update = { waitedDuringPlay: true, oldShellKeptUntilActivation: true, unrelatedCachePreserved: true, keysAfterActivation: updatedKeys }
  await updateContext.close()
  // Real HTTP responses must reject both a fresh install and an update, with
  // no partial cache and no mutation of a running version's known-good bytes.
  results.failedInstall = []
  results.failedUpdate = []
  for (const failure of failureCases) {
    failureProbe = failure
    const failedContext = await browser.newContext()
    const failedPage = await failedContext.newPage()
    const failedCdp = await failedContext.newCDPSession(failedPage)
    await failedCdp.send('Network.enable')
    await failedCdp.send('Network.setCacheDisabled', { cacheDisabled: true })
    const requestsBefore = probeRequests.length
    await failedPage.goto(origin)
    await failedPage.waitForSelector('[role=gridcell]')
    const state = await observeRejectedWorker(failedPage)
    results.failedInstall.push(checkRejection('install', failure, state, () => {
      assert.equal(state.state, 'redundant', 'broken first-install shell must be rejected')
      assert.deepEqual(state.caches, [])
      assert.equal(state.controlled, false)
      assert(probeRequests.length > requestsBefore, 'real server must serve the poisoned response')
    }))
    assert.equal(await failedPage.locator('[role=gridcell]').count(), 81, 'online play remains usable after failed install')
    await failedContext.close()
    failureProbe = null

    const retainedContext = await browser.newContext()
    const retainedPage = await retainedContext.newPage()
    const retainedCdp = await retainedContext.newCDPSession(retainedPage)
    await retainedCdp.send('Network.enable')
    await retainedCdp.send('Network.setCacheDisabled', { cacheDisabled: true })
    await retainedPage.goto(origin)
    await retainedPage.waitForSelector('[role=gridcell]')
    await retainedPage.evaluate(() => navigator.serviceWorker.ready)
    await retainedPage.waitForFunction(() => navigator.serviceWorker.controller)
    const activeCache = await retainedPage.evaluate(async () => (await caches.keys())[0])
    const before = await cacheSnapshot(retainedPage, activeCache)
    await writeFile(manifestPath, `${await readFile(manifestPath, 'utf8')}\n`)
    await build({ root, configLoader: 'runner', cacheDir: join(out, 'vite-cache') })
    failureProbe = failure
    const updateRequestsBefore = probeRequests.length
    const failedUpdate = await observeRejectedWorker(retainedPage, true)
    const after = await cacheSnapshot(retainedPage, activeCache)
    results.failedUpdate.push(checkRejection('update', failure, { ...failedUpdate, activeCache, before, after }, () => {
      assert.equal(failedUpdate.state, 'redundant', 'broken update shell must be rejected')
      assert.deepEqual(failedUpdate.caches, [activeCache], 'failed update removes only its partial new cache')
      assert.equal(failedUpdate.activeState, 'activated')
      assert.equal(failedUpdate.waiting, false)
      assert.equal(failedUpdate.controlled, true)
      assert.deepEqual(after, before, 'every active cache response remains byte-for-byte intact')
      assert(probeRequests.length > updateRequestsBefore, 'real server must serve the poisoned update response')
    }))
    await retainedCdp.send('Network.clearBrowserCache')
    await retainedContext.setOffline(true)
    await retainedPage.goto(`${origin}/offline-after-rejected-update?nonce=${Date.now()}`)
    await retainedPage.waitForSelector('[role=gridcell]')
    assert.equal(await retainedPage.locator('[role=gridcell]').count(), 81)
    results.failedUpdate.at(-1).activeShellWorksOffline = true
    await retainedContext.close()
    failureProbe = null
  }
  results.probeRequests = probeRequests
  results.failures = failures
  console.log(JSON.stringify({ output: out, failedInstall: results.failedInstall.map(({ failure, state, passed }) => ({ failure, state, passed })), failedUpdate: results.failedUpdate.map(({ failure, state, passed }) => ({ failure, state, passed })), failures }, null, 2))
  await writeFile(join(out, 'results.json'), JSON.stringify(results, null, 2))
  assert.deepEqual(failures, [], 'all poisoned first installs and updates must be rejected')
} finally {
  await browser?.close()
  await server?.close()
}
