import { describe, it, expect } from 'vitest'
import headers from '../../public/_headers?raw'

function getCspValue(rawHeaders: string): string {
  const line = rawHeaders
    .split('\n')
    .find((row) => row.trim().startsWith('Content-Security-Policy:'))
  if (!line) {
    throw new Error('Content-Security-Policy header not found in _headers')
  }

  return line.split(':').slice(1).join(':').trim()
}

function getDirective(csp: string, name: string): string[] {
  const directive = csp
    .split(';')
    .map((part) => part.trim())
    .find((part) => part === name || part.startsWith(`${name} `))

  return directive ? directive.split(/\s+/).slice(1) : []
}

describe('CSP _headers', () => {
  it('allows Clerk production hosts for scripts and connections', () => {
    const csp = getCspValue(headers)
    const scriptSrc = getDirective(csp, 'script-src')
    const connectSrc = getDirective(csp, 'connect-src')

    expect(scriptSrc).toContain('https://*.clerk.com')
    expect(scriptSrc).toContain('https://clerk.htoprc.dev')
    expect(connectSrc).toContain('https://*.clerk.com')
    expect(connectSrc).toContain('wss://*.clerk.com')
    expect(connectSrc).toContain('https://clerk.htoprc.dev')
    expect(connectSrc).toContain('wss://clerk.htoprc.dev')
  })
})
