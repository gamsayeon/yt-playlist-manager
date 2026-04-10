import { VideoItem } from "../types";

export type { VideoItem };

const STORAGE_KEYS = {
  TEMP_LIST: "tempList",
  CACHED_PLAYLISTS: "cachedPlaylists",
  CACHED_PLAYLISTS_AT: "cachedPlaylistsAt",
  USER_ID: "userId",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export interface Playlist {
  id: string;
  title: string;
  itemCount: number;
}

const TTL_MS = 5 * 60 * 1000; // 5분

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
  const operationPromise = tempListQueue.then(async () => {
    const list = await getTempList();
    const exists = list.some((item) => item.videoId === video.videoId);
    if (exists) return;
    await setStorage(STORAGE_KEYS.TEMP_LIST, [...list, video]);
  });

  tempListQueue = operationPromise.catch(() => {});
  await operationPromise;
}

/** 임시 리스트에서 영상 제거 */
export async function removeFromTempList(videoId: string): Promise<void> {
  const operationPromise = tempListQueue.then(async () => {
    const list = await getTempList();
    const filtered = list.filter((item) => item.videoId !== videoId);
    if (list.length > filtered.length) {
      await setStorage(STORAGE_KEYS.TEMP_LIST, filtered);
    }
  });

  tempListQueue = operationPromise.catch(() => {});
  await operationPromise;
}

/** 임시 리스트 전체 초기화 */
export async function clearTempList(): Promise<void> {
  const operationPromise = tempListQueue.then(async () => {
    await removeStorage(STORAGE_KEYS.TEMP_LIST);
  });

  tempListQueue = operationPromise.catch(() => {});
  await operationPromise;
}

/** 캐시된 재생목록 조회 (5분 TTL) */
export async function getCachedPlaylists(): Promise<Playlist[] | null> {
  const items = await chrome.storage.local.get([
    STORAGE_KEYS.CACHED_PLAYLISTS_AT,
    STORAGE_KEYS.CACHED_PLAYLISTS,
  ]);

  const cachedAt = items[STORAGE_KEYS.CACHED_PLAYLISTS_AT];
  const playlists = items[STORAGE_KEYS.CACHED_PLAYLISTS];

  if (!cachedAt || !playlists) return null;

  const isExpired = Date.now() - (cachedAt as number) > TTL_MS;
  if (isExpired) {
    await invalidatePlaylists();
    return null;
  }

  return playlists as Playlist[];
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