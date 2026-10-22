/// <reference types="node" />
import { readFileSync } from 'node:fs'

// Read from disk: Vitest stubs CSS imports, so `?raw` would come back empty.
const uiDoc = readFileSync('docs/ui.md', 'utf8')
const tokensCss = readFileSync('src/styles/tokens.css', 'utf8')

function parseDocTokens(markdown: string) {
  const rows = markdown.matchAll(/^\| `(--color-[\w-]+)` \| `(#[0-9A-Fa-f]{6})` \|/gm)
  return Object.fromEntries([...rows].map(([, name, hex]) => [name, hex?.toLowerCase()]))
}

function parseCssTokens(css: string) {
  const declarations = css.matchAll(/(--color-[\w-]+):\s*(#[0-9a-fA-F]{6});/g)
  return Object.fromEntries([...declarations].map(([, name, hex]) => [name, hex?.toLowerCase()]))
}

describe('design tokens', () => {
  it('match the color table in docs/ui.md', () => {
    const docTokens = parseDocTokens(uiDoc)
    expect(Object.keys(docTokens).length).toBeGreaterThan(0)
    expect(parseCssTokens(tokensCss)).toEqual(docTokens)
  })

  it('remove the default Tailwind palette', () => {
    expect(tokensCss).toContain('--color-*: initial;')
  })
})
