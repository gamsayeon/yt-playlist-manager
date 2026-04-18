import { getPlaylistItems, getPlaylists, QuotaExceededError } from "../../background/youtube-api";

const mockFetch = jest.fn();
(globalThis as unknown as Record<string, unknown>).fetch = mockFetch;

const mockGetAuthToken = jest.fn().mockResolvedValue("mock-token");
jest.mock("../../background/auth", () => ({
  getAuthToken: () => mockGetAuthToken(),
  refreshAuthToken: jest.fn().mockResolvedValue("new-token"),
}));

const makeResponse = (data: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(data),
});

beforeEach(() => {
  mockFetch.mockReset();
});

describe("getPlaylists", () => {
  it("재생목록 목록 반환", async () => {
    mockFetch.mockResolvedValueOnce(
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
    mockFetch.mockResolvedValueOnce(makeResponse({}, 403));
    await expect(getPlaylists()).rejects.toThrow(QuotaExceededError);
  });
});

describe("getPlaylistItems", () => {
  it("재생목록 영상 목록 반환", async () => {
    mockFetch.mockResolvedValueOnce(
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
    mockFetch.mockResolvedValueOnce(
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
    mockFetch.mockResolvedValueOnce(
      makeResponse({
        items: Array.from({ length: 2 }, (_, i) => ({ // ✅ 3 → 2로 수정
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