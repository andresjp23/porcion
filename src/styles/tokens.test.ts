/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs'

// docs/ is local only (.gitignore), so CI checks the CSS without the table.
const UI_DOC = 'docs/ui.md'
const hasUiDoc = existsSync(UI_DOC)

// Read from disk: Vitest stubs CSS imports, so `?raw` would come back empty.
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
  it.skipIf(!hasUiDoc)('match the color table in docs/ui.md', () => {
    const docTokens = parseDocTokens(readFileSync(UI_DOC, 'utf8'))
    expect(Object.keys(docTokens).length).toBeGreaterThan(0)
    expect(parseCssTokens(tokensCss)).toEqual(docTokens)
  })

  it('remove the default Tailwind palette', () => {
    expect(tokensCss).toContain('--color-*: initial;')
  })
})
