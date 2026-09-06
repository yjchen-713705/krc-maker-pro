const STORAGE_KEY = 'defaultSavePath'

export function loadDefaultSavePath(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function saveDefaultSavePath(path: string | null): void {
  if (path === null) {
    localStorage.removeItem(STORAGE_KEY)
  } else {
    localStorage.setItem(STORAGE_KEY, path)
  }
}