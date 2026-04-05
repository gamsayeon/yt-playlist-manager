const STORAGE_KEYS = {
  TEMP_LIST: "tempList",
  CACHED_PLAYLISTS: "cachedPlaylists",
  CACHED_PLAYLISTS_AT: "cachedPlaylistsAt",
  USER_ID: "userId",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/** 단일 키 조회 */
export async function getStorage<T>(key: StorageKey): Promise<T | null> {
  const result = await chrome.storage.local.get(key);
  return result[key] ?? null;
}

/** 단일 키 저장 */
export async function setStorage<T>(key: StorageKey, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

/** 단일 키 삭제 */
export async function removeStorage(key: StorageKey): Promise<void> {
  await chrome.storage.local.remove(key);
}

/** 전체 스토리지 초기화 */
export async function clearStorage(): Promise<void> {
  await chrome.storage.local.clear();
}

export { STORAGE_KEYS };