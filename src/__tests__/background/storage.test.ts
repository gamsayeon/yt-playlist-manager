/// <reference types="jest" />
import {
  getTempList,
  addToTempList,
  addToTempListBatch,
  removeFromTempList,
  removeFromTempListByPlaylistId,
  clearTempList,
  getCachedPlaylists,
  setCachedPlaylists,
  invalidatePlaylists,
} from "../../background/storage";
import type { VideoItem } from "../../types";

const mockStorage: Record<string, unknown> = {};

beforeEach(() => {
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);

  (chrome.storage.local.get as jest.Mock).mockImplementation(
    (keys: string | string[]) => {
      if (typeof keys === "string") {
        return Promise.resolve({ [keys]: mockStorage[keys] });
      }
      const result: Record<string, unknown> = {};
      keys.forEach((k) => { result[k] = mockStorage[k]; });
      return Promise.resolve(result);
    }
  );

  (chrome.storage.local.set as jest.Mock).mockImplementation(
    (items: Record<string, unknown>) => {
      Object.assign(mockStorage, items);
      return Promise.resolve();
    }
  );

  (chrome.storage.local.remove as jest.Mock).mockImplementation(
    (keys: string | string[]) => {
      const arr = typeof keys === "string" ? [keys] : keys;
      arr.forEach((k) => delete mockStorage[k]);
      return Promise.resolve();
    }
  );
});

const makeVideo = (videoId: string, playlistId?: string): VideoItem => ({
  videoId,
  title: `title-${videoId}`,
  thumbnail: `https://example.com/${videoId}.jpg`,
  playlistId,
});

describe("getTempList", () => {
  it("빈 리스트 반환", async () => {
    expect(await getTempList()).toEqual([]);
  });

  it("저장된 리스트 반환", async () => {
    const video = makeVideo("v1");
    mockStorage["tempList"] = [video];
    expect(await getTempList()).toEqual([video]);
  });
});

describe("addToTempList", () => {
  it("영상 추가", async () => {
    const video = makeVideo("v1");
    await addToTempList(video);
    expect(await getTempList()).toEqual([video]);
  });

  it("중복 추가 방지", async () => {
    const video = makeVideo("v1");
    await addToTempList(video);
    await addToTempList(video);
    expect(await getTempList()).toHaveLength(1);
  });
});

describe("addToTempListBatch", () => {
  it("여러 영상 한번에 추가", async () => {
    const videos = [makeVideo("v1"), makeVideo("v2"), makeVideo("v3")];
    await addToTempListBatch(videos);
    expect(await getTempList()).toHaveLength(3);
  });

  it("중복 영상 제외", async () => {
    await addToTempList(makeVideo("v1"));
    await addToTempListBatch([makeVideo("v1"), makeVideo("v2")]);
    expect(await getTempList()).toHaveLength(2);
  });

  it("빈 배열 처리", async () => {
    await addToTempListBatch([]);
    expect(await getTempList()).toHaveLength(0);
  });
});

describe("removeFromTempList", () => {
  it("영상 제거", async () => {
    await addToTempList(makeVideo("v1"));
    await addToTempList(makeVideo("v2"));
    await removeFromTempList("v1");
    const list = await getTempList();
    expect(list).toHaveLength(1);
    expect(list[0].videoId).toBe("v2");
  });

  it("없는 영상 제거 시 변화 없음", async () => {
    await addToTempList(makeVideo("v1"));
    await removeFromTempList("v999");
    expect(await getTempList()).toHaveLength(1);
  });
});

describe("removeFromTempListByPlaylistId", () => {
  it("해당 재생목록 영상 전체 제거", async () => {
    await addToTempListBatch([
      makeVideo("v1", "pl-A"),
      makeVideo("v2", "pl-A"),
      makeVideo("v3", "pl-B"),
    ]);
    await removeFromTempListByPlaylistId("pl-A");
    const list = await getTempList();
    expect(list).toHaveLength(1);
    expect(list[0].videoId).toBe("v3");
  });

  it("해당 재생목록 없으면 변화 없음", async () => {
    await addToTempListBatch([makeVideo("v1", "pl-A")]);
    await removeFromTempListByPlaylistId("pl-B");
    expect(await getTempList()).toHaveLength(1);
  });
});

describe("clearTempList", () => {
  it("전체 초기화", async () => {
    await addToTempListBatch([makeVideo("v1"), makeVideo("v2")]);
    await clearTempList();
    expect(await getTempList()).toEqual([]);
  });
});

describe("getCachedPlaylists / setCachedPlaylists / invalidatePlaylists", () => {
  const playlists = [
    {
      id: "pl1",
      title: "테스트",
      description: "",
      privacyStatus: "public",
      itemCount: 5,
      publishedAt: "2024-01-01",
    },
  ];

  it("캐시 저장 후 조회", async () => {
    await setCachedPlaylists(playlists);
    expect(await getCachedPlaylists()).toEqual(playlists);
  });

  it("캐시 무효화 후 null 반환", async () => {
    await setCachedPlaylists(playlists);
    await invalidatePlaylists();
    expect(await getCachedPlaylists()).toBeNull();
  });

  it("캐시 없으면 null 반환", async () => {
    expect(await getCachedPlaylists()).toBeNull();
  });

  // ✅ jest.useFakeTimers()로 시간 제어
  it("TTL 만료 시 null 반환", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date());
    await setCachedPlaylists(playlists);
    jest.advanceTimersByTime(6 * 60 * 1000);
    expect(await getCachedPlaylists()).toBeNull();
    jest.useRealTimers();
  });
});