/** "Versión 1.0.0 · a3f9c2e", so a phone can tell whether it already has the latest build (M-3). */
export function versionLabel(version: string, commit: string) {
  return commit ? `Versión ${version} · ${commit}` : `Versión ${version}`
}

export const appVersionLabel = () => versionLabel(__APP_VERSION__, __APP_COMMIT__)
