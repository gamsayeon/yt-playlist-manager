import {
  getTempList,
  addToTempList,
  removeFromTempList,
  clearTempList,
  getCachedPlaylists,
  setCachedPlaylists,
  invalidatePlaylists,
  VideoItem,
  Playlist,
} from "../storage";

const mockVideo1: VideoItem = {
  videoId: "video1",
  title: "테스트 영상 1",
  thumbnail: "https://example.com/thumb1.jpg",
};

const mockVideo2: VideoItem = {
  videoId: "video2",
  title: "테스트 영상 2",
  thumbnail: "https://example.com/thumb2.jpg",
};

const mockPlaylists: Playlist[] = [
  { id: "pl1", title: "재생목록 1", itemCount: 3 },
  { id: "pl2", title: "재생목록 2", itemCount: 5 },
];

beforeEach(() => {
  (chrome.storage.local.get as jest.Mock).mockReset();
  (chrome.storage.local.set as jest.Mock).mockReset();
  (chrome.storage.local.remove as jest.Mock).mockReset();

  (chrome.storage.local.get as jest.Mock).mockResolvedValue({});
  (chrome.storage.local.set as jest.Mock).mockResolvedValue(undefined);
  (chrome.storage.local.remove as jest.Mock).mockResolvedValue(undefined);
});

describe("getTempList", () => {
  it("빈 스토리지에서 빈 배열을 반환한다", async () => {
    const result = await getTempList();
    expect(result).toEqual([]);
  });

  it("저장된 임시 리스트를 반환한다", async () => {
    (chrome.storage.local.get as jest.Mock).mockResolvedValue({
      tempList: [mockVideo1],
    });

    const result = await getTempList();
    expect(result).toEqual([mockVideo1]);
  });
});

describe("addToTempList", () => {
  it("영상을 임시 리스트에 추가한다", async () => {
    await addToTempList(mockVideo1);
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      tempList: [mockVideo1],
    });
  });

  it("중복 영상은 추가하지 않는다", async () => {
    (chrome.storage.local.get as jest.Mock).mockResolvedValue({
      tempList: [mockVideo1],
    });

    await addToTempList(mockVideo1);
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });

  it("서로 다른 영상을 순서대로 추가한다", async () => {
    (chrome.storage.local.get as jest.Mock).mockResolvedValue({
      tempList: [mockVideo1],
    });

    await addToTempList(mockVideo2);
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      tempList: [mockVideo1, mockVideo2],
    });
  });
});

describe("removeFromTempList", () => {
  it("videoId에 해당하는 영상을 제거한다", async () => {
    (chrome.storage.local.get as jest.Mock).mockResolvedValue({
      tempList: [mockVideo1, mockVideo2],
    });

    await removeFromTempList("video1");
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      tempList: [mockVideo2],
    });
  });

  it("존재하지 않는 videoId 제거 시 setStorage를 호출하지 않는다", async () => {
    (chrome.storage.local.get as jest.Mock).mockResolvedValue({
      tempList: [mockVideo1],
    });

    await removeFromTempList("nonexistent");
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });
});

describe("clearTempList", () => {
  it("임시 리스트를 초기화한다", async () => {
    await clearTempList();
    expect(chrome.storage.local.remove).toHaveBeenCalledWith("tempList");
  });
});

describe("getCachedPlaylists", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("캐시가 없으면 null을 반환한다", async () => {
    const result = await getCachedPlaylists();
    expect(result).toBeNull();
  });

  it("TTL 이내의 캐시를 반환한다", async () => {
    const now = Date.now();
    jest.setSystemTime(now);

    (chrome.storage.local.get as jest.Mock)
      .mockResolvedValueOnce({ cachedPlaylistsAt: now })
      .mockResolvedValueOnce({ cachedPlaylists: mockPlaylists });

    const result = await getCachedPlaylists();
    expect(result).toEqual(mockPlaylists);
  });

  it("TTL 만료 시 null을 반환하고 캐시를 삭제한다", async () => {
    const now = Date.now();
    jest.setSystemTime(now + 6 * 60 * 1000);

    (chrome.storage.local.get as jest.Mock).mockResolvedValue({
      cachedPlaylistsAt: now,
    });

    const result = await getCachedPlaylists();
    expect(result).toBeNull();
    expect(chrome.storage.local.remove).toHaveBeenCalledWith([
      "cachedPlaylists",
      "cachedPlaylistsAt",
    ]);
  });
});

describe("setCachedPlaylists", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("재생목록과 타임스탬프를 저장한다", async () => {
    const now = Date.now();
    jest.setSystemTime(now);

    await setCachedPlaylists(mockPlaylists);

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      cachedPlaylists: mockPlaylists,
      cachedPlaylistsAt: now,
    });
  });
});

describe("invalidatePlaylists", () => {
  it("캐시와 타임스탬프를 동시에 삭제한다", async () => {
    await invalidatePlaylists();
    expect(chrome.storage.local.remove).toHaveBeenCalledWith([
      "cachedPlaylists",
      "cachedPlaylistsAt",
    ]);
  });
});