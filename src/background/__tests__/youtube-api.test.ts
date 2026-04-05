import {
  getPlaylists,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addItemToPlaylist,
  removeItemFromPlaylist,
  QuotaExceededError,
} from "../youtube-api";

jest.mock("../auth", () => ({
  getAuthToken: jest.fn().mockResolvedValue("mock-token"),
  refreshAuthToken: jest.fn().mockResolvedValue("new-mock-token"),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe("getPlaylists", () => {
  it("재생목록 목록을 반환한다", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          {
            id: "pl1",
            snippet: { title: "재생목록 1" },
            contentDetails: { itemCount: 3 },
          },
          {
            id: "pl2",
            snippet: { title: "재생목록 2" },
            contentDetails: { itemCount: 5 },
          },
        ],
      }),
    });

    const result = await getPlaylists();
    expect(result).toEqual([
      { id: "pl1", title: "재생목록 1", itemCount: 3 },
      { id: "pl2", title: "재생목록 2", itemCount: 5 },
    ]);
  });

  it("nextPageToken이 있으면 다음 페이지를 조회한다", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: "pl1",
              snippet: { title: "재생목록 1" },
              contentDetails: { itemCount: 3 },
            },
          ],
          nextPageToken: "token123",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: "pl2",
              snippet: { title: "재생목록 2" },
              contentDetails: { itemCount: 5 },
            },
          ],
        }),
      });

    const result = await getPlaylists();
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      { id: "pl1", title: "재생목록 1", itemCount: 3 },
      { id: "pl2", title: "재생목록 2", itemCount: 5 },
    ]);
  });
});

describe("createPlaylist", () => {
  it("재생목록을 생성하고 반환한다", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: "pl1",
        snippet: { title: "새 재생목록" },
        contentDetails: { itemCount: 0 },
      }),
    });

    const result = await createPlaylist("새 재생목록");
    expect(result).toEqual({ id: "pl1", title: "새 재생목록", itemCount: 0 });
  });
});

describe("updatePlaylist", () => {
  it("재생목록 제목을 수정하고 itemCount를 반환한다", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: "pl1",
        snippet: { title: "수정된 제목" },
        contentDetails: { itemCount: 5 },
      }),
    });

    const result = await updatePlaylist("pl1", "수정된 제목");
    expect(result).toEqual({ id: "pl1", title: "수정된 제목", itemCount: 5 });
  });

  it("contentDetails가 없으면 itemCount를 0으로 반환한다", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: "pl1",
        snippet: { title: "수정된 제목" },
      }),
    });

    const result = await updatePlaylist("pl1", "수정된 제목");
    expect(result).toEqual({ id: "pl1", title: "수정된 제목", itemCount: 0 });
  });
});

describe("deletePlaylist", () => {
  it("재생목록을 삭제한다", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => ({}),
    });

    await expect(deletePlaylist("pl1")).resolves.toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("pl1"),
      expect.objectContaining({ method: "DELETE" })
    );
  });
});

describe("addItemToPlaylist", () => {
  it("재생목록에 영상을 추가한다", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    await expect(addItemToPlaylist("pl1", "video1")).resolves.toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("playlistItems"),
      expect.objectContaining({ method: "POST" })
    );
  });
});

describe("removeItemFromPlaylist", () => {
  it("재생목록에서 영상을 제거한다", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => ({}),
    });

    await expect(
      removeItemFromPlaylist("playlistItemId1")
    ).resolves.toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("playlistItemId1"),
      expect.objectContaining({ method: "DELETE" })
    );
  });
});

describe("fetchWithAuth 공통 처리", () => {
  it("401 응답 시 토큰 재발급 후 1회 재시도한다", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: "pl1",
              snippet: { title: "재생목록 1" },
              contentDetails: { itemCount: 3 },
            },
          ],
        }),
      });

    const result = await getPlaylists();
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual([{ id: "pl1", title: "재생목록 1", itemCount: 3 }]);
  });

  it("401 응답이 반복되면 에러를 던진다", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    });

    await expect(getPlaylists()).rejects.toThrow("API 요청 실패: 401");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("403 응답 시 QuotaExceededError를 던진다", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({}),
    });

    await expect(getPlaylists()).rejects.toThrow(QuotaExceededError);
  });

  it("기타 에러 응답 시 에러를 던진다", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    await expect(getPlaylists()).rejects.toThrow("API 요청 실패: 500");
  });
});