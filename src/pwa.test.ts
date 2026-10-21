import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { registerPwa } from './pwa'

afterEach(() => vi.unstubAllGlobals())
describe('production service worker registration', () => {
  it('registers the root worker only in production without forcing updates', async () => {
    const register = vi.fn().mockResolvedValue({})
    vi.stubGlobal('navigator', { serviceWorker: { register } })
    await registerPwa(false)
    expect(register).not.toHaveBeenCalled()
    await registerPwa(true)
    expect(register).toHaveBeenCalledExactlyOnceWith('/sw.js', { scope: '/', updateViaCache: 'none' })
  })
  it('degrades safely when registration is unsupported, denied or throws', async () => {
    vi.stubGlobal('navigator', {})
    await expect(registerPwa(true)).resolves.toBeUndefined()
    vi.stubGlobal('navigator', { serviceWorker: { register: vi.fn().mockRejectedValue(new Error('denied')) } })
    await expect(registerPwa(true)).resolves.toBeUndefined()
    vi.stubGlobal('navigator', { get serviceWorker() { throw new Error('blocked') } })
    await expect(registerPwa(true)).resolves.toBeUndefined()
  })
})

// Exercise the actual generated-worker helper, not a duplicate test policy.
const configSource = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8')
const helperSource = configSource.match(/async function validateShellResponse\(path, response\) \{[\s\S]*?\n\}\n(?=self.addEventListener\('install')/)?.[0]
if (!helperSource) throw new Error('Generated worker is missing its install-response validator')
const validateShellResponse = runInNewContext(`${helperSource}; validateShellResponse`) as (path: string, response: Response) => Promise<void>

describe('generated offline shell response integrity', () => {
  it.each([
    ['/index.html', 'Text/Html; charset=UTF-8'],
    ['/assets/index.css', 'TEXT/CSS; charset=utf-8'],
    ['/assets/index.js', 'text/javascript'],
    ['/assets/generated-worker.js', 'Application/JavaScript; charset=utf-8'],
    ['/assets/module.mjs', 'text/javascript'],
    ['/manifest.webmanifest', 'application/manifest+json'],
    ['/manifest.webmanifest', 'application/json'],
    ['/assets/data.json', 'application/json'],
    ['/favicon.svg', 'image/svg+xml'],
    ['/icons/icon-512.png', 'image/png'],
    ['/assets/future.wasm', 'application/wasm'],
  ])('accepts a nonempty HTTP 200 %s with normalized media type %s', async (path, type) => {
    const response = new Response('required body', { headers: { 'content-type': type } })
    const clone = vi.spyOn(response, 'clone')
    const originalRead = vi.spyOn(response, 'arrayBuffer')
    await expect(validateShellResponse(path, response)).resolves.toBeUndefined()
    expect(clone).toHaveBeenCalledTimes(1)
    expect(originalRead).not.toHaveBeenCalled()
    expect(response.bodyUsed).toBe(false)
    expect(await response.text()).toBe('required body')
  })
  it.each([
    ['/icons/icon.png', 200, 'Text/Html', '<!doctype html>'],
    ['/assets/generated-worker.js', 204, 'application/javascript', null],
    ['/assets/index.js', 200, 'text/plain', 'not a script'],
    ['/assets/index.js', 200, 'text/javascript', ''],
    ['/index.html', 200, 'text/plain', 'not HTML'],
    ['/assets/index.css', 200, 'text/html', '<!doctype html>'],
    ['/manifest.webmanifest', 200, 'text/plain', '{}'],
    ['/favicon.svg', 200, 'image/png', 'not SVG'],
    ['/icons/icon.png', 206, 'image/png', 'partial'],
    ['/assets/unknown.bin', 200, 'application/octet-stream', 'unknown'],
    ['/assets/future.wasm', 200, 'application/octet-stream', 'wrong type'],
    ['/assets/index.js', 200, '', 'missing type'],
  ])('rejects %s with HTTP %s, media type %s or an empty body', async (path, status, type, body) => {
    const response = new Response(body, { status, headers: { 'content-type': type } })
    await expect(validateShellResponse(path, response)).rejects.toThrow(/offline shell response/)
  })
  it('rejects redirected HTTP 200 responses', async () => {
    const response = new Response('script', { headers: { 'content-type': 'text/javascript' } })
    Object.defineProperty(response, 'redirected', { value: true })
    await expect(validateShellResponse('/assets/index.js', response)).rejects.toThrow(/Invalid offline shell response/)
  })
  it('keeps validation at install time with no runtime writes or forced activation', () => {
    const install = configSource.slice(configSource.indexOf("self.addEventListener('install'"), configSource.indexOf("self.addEventListener('activate'"))
    const fetch = configSource.slice(configSource.indexOf("self.addEventListener('fetch'"))
    expect(install).toContain('await validateShellResponse(path, response)')
    expect(install.indexOf('await validateShellResponse')).toBeLessThan(install.indexOf('cache.put'))
    expect(fetch).not.toMatch(/validateShellResponse|\.put\(|\.arrayBuffer\(|\.clone\(/)
    expect(configSource).not.toContain('skipWaiting')
  })
})
