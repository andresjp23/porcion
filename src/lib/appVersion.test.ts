import { versionLabel } from './appVersion'

describe('versionLabel', () => {
  it('shows the version and the commit it was built from', () => {
    expect(versionLabel('1.0.0', 'a3f9c2e')).toBe('Versión 1.0.0 · a3f9c2e')
  })

  it('leaves the commit out when the build had none', () => {
    expect(versionLabel('1.0.0', '')).toBe('Versión 1.0.0')
  })
})
