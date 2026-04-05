const STORAGE_KEYS = {
  TEMP_LIST: "tempList",
  CACHED_PLAYLISTS: "cachedPlaylists",
  CACHED_PLAYLISTS_AT: "cachedPlaylistsAt",
  USER_ID: "userId",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export interface VideoItem {
  videoId: string;
  title: string;
  thumbnail: string;
}

export interface Playlist {
  id: string;
  title: string;
  itemCount: number;
}

const TTL_MS = 5 * 60 * 1000; // 5분

// 임시 리스트 작업 직렬화를 위한 Promise 체인
let tempListQueue: Promise<void> = Promise.resolve();

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

/** 임시 리스트 조회 */
export async function getTempList(): Promise<VideoItem[]> {
  const list = await getStorage<VideoItem[]>(STORAGE_KEYS.TEMP_LIST);
  return list ?? [];
}

/** 임시 리스트에 영상 추가 */
export async function addToTempList(video: VideoItem): Promise<void> {
  tempListQueue = tempListQueue.then(async () => {
    const list = await getTempList();
    const exists = list.some((item) => item.videoId === video.videoId);
    if (exists) return;
    await setStorage(STORAGE_KEYS.TEMP_LIST, [...list, video]);
  });
  await tempListQueue;
}

/** 임시 리스트에서 영상 제거 */
export async function removeFromTempList(videoId: string): Promise<void> {
  tempListQueue = tempListQueue.then(async () => {
    const list = await getTempList();
    const filtered = list.filter((item) => item.videoId !== videoId);
    if (list.length > filtered.length) {
      await setStorage(STORAGE_KEYS.TEMP_LIST, filtered);
    }
  });
  await tempListQueue;
}

/** 임시 리스트 전체 초기화 */
export async function clearTempList(): Promise<void> {
  await removeStorage(STORAGE_KEYS.TEMP_LIST);
}

/** 캐시된 재생목록 조회 (5분 TTL) */
export async function getCachedPlaylists(): Promise<Playlist[] | null> {
  const cachedAt = await getStorage<number>(STORAGE_KEYS.CACHED_PLAYLISTS_AT);

  if (!cachedAt) return null;

  const isExpired = Date.now() - cachedAt > TTL_MS;
  if (isExpired) return null;

  return getStorage<Playlist[]>(STORAGE_KEYS.CACHED_PLAYLISTS);
}

/** 캐시된 재생목록 저장 */
export async function setCachedPlaylists(playlists: Playlist[]): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.CACHED_PLAYLISTS]: playlists,
    [STORAGE_KEYS.CACHED_PLAYLISTS_AT]: Date.now(),
  });
}

/** 캐시 무효화 */
export async function invalidatePlaylists(): Promise<void> {
  await chrome.storage.local.remove([
    STORAGE_KEYS.CACHED_PLAYLISTS,
    STORAGE_KEYS.CACHED_PLAYLISTS_AT,
  ]);
}

export { STORAGE_KEYS };