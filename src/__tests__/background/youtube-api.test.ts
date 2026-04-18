/// <reference types="jest" />
import {
  getPlaylistItems,
  getPlaylists,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addItemToPlaylist,
  removeItemFromPlaylist,
  QuotaExceededError,
} from "../../background/youtube-api";

jest.mock("../../background/auth", () => ({
  getAuthToken: jest.fn().mockResolvedValue("mock-token"),
  refreshAuthToken: jest.fn().mockResolvedValue("new-token"),
}));

const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

const makeResponse = (data: unknown, status = 200) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("getPlaylists", () => {
  it("재생목록 목록 반환", async () => {
    mockFetch.mockImplementationOnce(() =>
      makeResponse({
        items: [
          {
            id: "pl1",
            snippet: { title: "테스트", description: "", publishedAt: "2024-01-01" },
            contentDetails: { itemCount: 5 },
            status: { privacyStatus: "public" },
          },
        ],
      })
    );

    const result = await getPlaylists();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("pl1");
    expect(result[0].title).toBe("테스트");
  });

  it("403 응답 시 QuotaExceededError", async () => {
    mockFetch.mockImplementationOnce(() => makeResponse({}, 403));
    await expect(getPlaylists()).rejects.toThrow(QuotaExceededError);
  });

  it("401 응답 시 토큰 갱신 후 재시도", async () => {
    mockFetch
      .mockImplementationOnce(() => makeResponse({}, 401))
      .mockImplementationOnce(() =>
        makeResponse({
          items: [
            {
              id: "pl1",
              snippet: { title: "테스트", description: "", publishedAt: "2024-01-01" },
              contentDetails: { itemCount: 5 },
              status: { privacyStatus: "public" },
            },
          ],
        })
      );

    const result = await getPlaylists();
    expect(result).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe("getPlaylistItems", () => {
  it("재생목록 영상 목록 반환", async () => {
    mockFetch.mockImplementationOnce(() =>
      makeResponse({
        items: [
          {
            id: "item1",
            snippet: {
              title: "영상1",
              resourceId: { videoId: "v1" },
              thumbnails: { medium: { url: "https://example.com/v1.jpg" } },
            },
            status: { privacyStatus: "public" },
          },
        ],
      })
    );

    const result = await getPlaylistItems("pl1");
    expect(result).toHaveLength(1);
    expect(result[0].videoId).toBe("v1");
    expect(result[0].privacyStatus).toBe("public");
  });

  it("비공개 영상 privacyStatus 반환", async () => {
    mockFetch.mockImplementationOnce(() =>
      makeResponse({
        items: [
          {
            id: "item2",
            snippet: {
              title: "Private video",
              resourceId: { videoId: "v2" },
              thumbnails: {},
            },
            status: { privacyStatus: "private" },
          },
        ],
      })
    );

    const result = await getPlaylistItems("pl1");
    expect(result[0].privacyStatus).toBe("private");
  });

  it("maxResults 제한 적용", async () => {
    mockFetch.mockImplementationOnce(() =>
      makeResponse({
        items: Array.from({ length: 2 }, (_, i) => ({
          id: `item${i}`,
          snippet: {
            title: `영상${i}`,
            resourceId: { videoId: `v${i}` },
            thumbnails: {},
          },
          status: { privacyStatus: "public" },
        })),
      })
    );

    const result = await getPlaylistItems("pl1", 2);
    expect(result).toHaveLength(2);
  });
});

describe("createPlaylist", () => {
  it("재생목록 생성 성공", async () => {
    mockFetch.mockImplementationOnce(() =>
      makeResponse({
        id: "new-pl",
        snippet: { title: "새 재생목록", description: "" },
        status: { privacyStatus: "private" },
        contentDetails: { itemCount: 0 },
      })
    );

    const result = await createPlaylist("새 재생목록");
    expect(result.id).toBe("new-pl");
    expect(result.title).toBe("새 재생목록");
    expect(result.privacyStatus).toBe("private");
  });
});

describe("updatePlaylist", () => {
  it("재생목록 수정 성공", async () => {
    mockFetch.mockImplementationOnce(() =>
      makeResponse({
        id: "pl1",
        snippet: { title: "수정된 제목", description: "수정된 설명" },
        status: { privacyStatus: "public" },
        contentDetails: { itemCount: 3 },
      })
    );

    const result = await updatePlaylist("pl1", "수정된 제목", "수정된 설명", "public");
    expect(result.title).toBe("수정된 제목");
    expect(result.privacyStatus).toBe("public");
  });
});

describe("deletePlaylist", () => {
  it("재생목록 삭제 성공", async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, status: 204, json: () => Promise.resolve({}) } as Response)
    );
    await expect(deletePlaylist("pl1")).resolves.toBeUndefined();
  });
});

describe("addItemToPlaylist", () => {
  it("영상 추가 성공", async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) } as Response)
    );
    await expect(addItemToPlaylist("pl1", "v1")).resolves.toBeUndefined();
  });
});

describe("removeItemFromPlaylist", () => {
  it("영상 제거 성공", async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, status: 204, json: () => Promise.resolve({}) } as Response)
    );
    await expect(removeItemFromPlaylist("item1")).resolves.toBeUndefined();
  });
});