/** Saves `data` as a pretty-printed JSON file through the browser's download. */
export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  // After the click has started the download, not before.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
