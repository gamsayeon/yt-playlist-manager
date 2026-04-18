import { VideoItem } from "../types";

export type { VideoItem };

const STORAGE_KEYS = {
  TEMP_LIST: "tempList",
  CACHED_PLAYLISTS: "cachedPlaylists",
  CACHED_PLAYLISTS_AT: "cachedPlaylistsAt",
  USER_ID: "userId",
  PLAYLIST_VIDEO_IDS: "playlistVideoIds",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export interface Playlist {
  id: string;
  title: string;
  description: string;
  privacyStatus: string;
  itemCount: number;
  publishedAt: string;
}

const TTL_MS = 5 * 60 * 1000;

let tempListQueue: Promise<void> = Promise.resolve();

export async function getStorage<T>(key: StorageKey): Promise<T | null> {
  const result = await chrome.storage.local.get(key);
  return result[key] ?? null;
}

export async function setStorage<T>(key: StorageKey, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

export async function removeStorage(key: StorageKey): Promise<void> {
  await chrome.storage.local.remove(key);
}

export async function clearStorage(): Promise<void> {
  await chrome.storage.local.clear();
}

export async function getTempList(): Promise<VideoItem[]> {
  const list = await getStorage<VideoItem[]>(STORAGE_KEYS.TEMP_LIST);
  return list ?? [];
}

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

// ✅ 배치 추가
export async function addToTempListBatch(videos: VideoItem[]): Promise<void> {
  const operationPromise = tempListQueue.then(async () => {
    const list = await getTempList();
    const existingIds = new Set(list.map((item) => item.videoId));
    const newItems = videos.filter((v) => !existingIds.has(v.videoId));
    if (newItems.length === 0) return;
    await setStorage(STORAGE_KEYS.TEMP_LIST, [...list, ...newItems]);
  });

  tempListQueue = operationPromise.catch(() => {});
  await operationPromise;
}

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

// ✅ playlistId 기반 배치 제거
export async function removeFromTempListByPlaylistId(
  playlistId: string
): Promise<void> {
  const operationPromise = tempListQueue.then(async () => {
    const list = await getTempList();
    const filtered = list.filter((item) => item.playlistId !== playlistId);
    if (list.length !== filtered.length) {
      await setStorage(STORAGE_KEYS.TEMP_LIST, filtered);
    }
  });

  tempListQueue = operationPromise.catch(() => {});
  await operationPromise;
}

export async function clearTempList(): Promise<void> {
  const operationPromise = tempListQueue.then(async () => {
    await removeStorage(STORAGE_KEYS.TEMP_LIST);
  });

  tempListQueue = operationPromise.catch(() => {});
  await operationPromise;
}

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

export async function setCachedPlaylists(playlists: Playlist[]): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.CACHED_PLAYLISTS]: playlists,
    [STORAGE_KEYS.CACHED_PLAYLISTS_AT]: Date.now(),
  });
}

export async function invalidatePlaylists(): Promise<void> {
  await chrome.storage.local.remove([
    STORAGE_KEYS.CACHED_PLAYLISTS,
    STORAGE_KEYS.CACHED_PLAYLISTS_AT,
  ]);
}

export async function setPlaylistVideoIds(
  playlistId: string,
  videoIds: string[]
): Promise<void> {
  await chrome.storage.local.set({
    [`${STORAGE_KEYS.PLAYLIST_VIDEO_IDS}:${playlistId}`]: videoIds,
  });
}

// ✅ getPlaylistVideoIds 제거 (미사용)

export async function removePlaylistVideoIds(
  playlistId: string
): Promise<void> {
  await chrome.storage.local.remove(
    `${STORAGE_KEYS.PLAYLIST_VIDEO_IDS}:${playlistId}`
  );
}

export { STORAGE_KEYS };