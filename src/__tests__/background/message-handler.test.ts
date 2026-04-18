/// <reference types="jest" />
import { registerMessageHandler } from "../../background/message-handler";

jest.mock("../../background/youtube-api", () => ({
  getPlaylists: jest.fn().mockResolvedValue([]),
  getPlaylistItems: jest.fn().mockResolvedValue([]),
  createPlaylist: jest.fn(),
  updatePlaylist: jest.fn(),
  deletePlaylist: jest.fn(),
  addItemToPlaylist: jest.fn().mockResolvedValue(undefined),
  removeItemFromPlaylist: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../background/auth", () => ({
  login: jest.fn().mockResolvedValue("user-123"),
  logout: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../background/storage", () => ({
  getTempList: jest.fn().mockResolvedValue([]),
  addToTempList: jest.fn().mockResolvedValue(undefined),
  addToTempListBatch: jest.fn().mockResolvedValue(undefined),
  removeFromTempList: jest.fn().mockResolvedValue(undefined),
  removeFromTempListByPlaylistId: jest.fn().mockResolvedValue(undefined),
  clearTempList: jest.fn().mockResolvedValue(undefined),
  getCachedPlaylists: jest.fn().mockResolvedValue(null),
  setCachedPlaylists: jest.fn().mockResolvedValue(undefined),
  invalidatePlaylists: jest.fn().mockResolvedValue(undefined),
}));

import { getPlaylistItems, createPlaylist, deletePlaylist } from "../../background/youtube-api";
import {
  getTempList,
  addToTempListBatch,
  removeFromTempListByPlaylistId,
  clearTempList,
  getCachedPlaylists,
  setCachedPlaylists,
} from "../../background/storage";

const sendMessage = (
  message: unknown,
  senderId = "test-extension-id"
): Promise<unknown> => {
  return new Promise((resolve) => {
    const sender = { id: senderId } as chrome.runtime.MessageSender;
    const listeners = (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls;
    const listener = listeners[listeners.length - 1][0];
    let called = false;
    const isAsync = listener(message, sender, (res: unknown) => {
      called = true;
      resolve(res);
    });
    if (isAsync !== true && !called) resolve(undefined);
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  registerMessageHandler();
});

describe("GET_TEMP_LIST", () => {
  it("tempList 반환", async () => {
    (getTempList as jest.Mock).mockResolvedValueOnce([
      { videoId: "v1", title: "영상1", thumbnail: "" },
    ]);
    const res = await sendMessage({ type: "GET_TEMP_LIST" }) as { success: boolean; list: unknown[] };
    expect(res.success).toBe(true);
    expect(res.list).toHaveLength(1);
  });
});

describe("GET_PLAYLIST_ITEMS_FOR_TEMP", () => {
  it("payload 없으면 실패", async () => {
    const res = await sendMessage({
      type: "GET_PLAYLIST_ITEMS_FOR_TEMP",
      payload: {},
    }) as { success: boolean };
    expect(res.success).toBe(false);
  });

  it("타인 채널 비공개 영상 필터링", async () => {
    (getPlaylistItems as jest.Mock).mockResolvedValueOnce([
      { videoId: "v1", title: "공개", thumbnail: "", privacyStatus: "public", playlistItemId: "i1" },
      { videoId: "v2", title: "비공개", thumbnail: "", privacyStatus: "private", playlistItemId: "i2" },
    ]);

    const res = await sendMessage({
      type: "GET_PLAYLIST_ITEMS_FOR_TEMP",
      payload: { playlistId: "pl1", isOwnChannel: false },
    }) as { success: boolean; playlistItems: unknown[] };

    expect(res.success).toBe(true);
    expect(res.playlistItems).toHaveLength(1);
    expect(addToTempListBatch).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ videoId: "v1" })])
    );
  });

  it("본인 채널 비공개 포함 전체 추가", async () => {
    (getPlaylistItems as jest.Mock).mockResolvedValueOnce([
      { videoId: "v1", title: "공개", thumbnail: "", privacyStatus: "public", playlistItemId: "i1" },
      { videoId: "v2", title: "비공개", thumbnail: "", privacyStatus: "private", playlistItemId: "i2" },
    ]);

    const res = await sendMessage({
      type: "GET_PLAYLIST_ITEMS_FOR_TEMP",
      payload: { playlistId: "pl1", isOwnChannel: true },
    }) as { success: boolean; playlistItems: unknown[] };

    expect(res.success).toBe(true);
    expect(res.playlistItems).toHaveLength(2);
  });
});

describe("REMOVE_PLAYLIST_ITEMS_FROM_TEMP", () => {
  it("payload 없으면 실패", async () => {
    const res = await sendMessage({
      type: "REMOVE_PLAYLIST_ITEMS_FROM_TEMP",
      payload: {},
    }) as { success: boolean };
    expect(res.success).toBe(false);
  });

  it("재생목록 영상 일괄 제거", async () => {
    const res = await sendMessage({
      type: "REMOVE_PLAYLIST_ITEMS_FROM_TEMP",
      payload: { playlistId: "pl1" },
    }) as { success: boolean };

    expect(res.success).toBe(true);
    expect(removeFromTempListByPlaylistId).toHaveBeenCalledWith("pl1");
  });
});

describe("CREATE_PLAYLIST", () => {
  it("payload 없으면 실패", async () => {
    const res = await sendMessage({
      type: "CREATE_PLAYLIST",
      payload: {},
    }) as { success: boolean };
    expect(res.success).toBe(false);
  });

  it("tempList 비어있으면 실패", async () => {
    (getTempList as jest.Mock).mockResolvedValueOnce([]);
    const res = await sendMessage({
      type: "CREATE_PLAYLIST",
      payload: { title: "새 재생목록" },
    }) as { success: boolean; error: string };
    expect(res.success).toBe(false);
    expect(res.error).toBe("재생목록에 추가할 영상이 없습니다.");
  });

  it("재생목록 생성 성공", async () => {
    (getTempList as jest.Mock).mockResolvedValueOnce([
      { videoId: "v1", title: "영상1", thumbnail: "" },
    ]);
    (createPlaylist as jest.Mock).mockResolvedValueOnce({
      id: "new-pl",
      title: "새 재생목록",
      description: "",
      privacyStatus: "private",
      itemCount: 0,
      publishedAt: "2024-01-01",
    });
    (getCachedPlaylists as jest.Mock).mockResolvedValueOnce([]);

    const res = await sendMessage({
      type: "CREATE_PLAYLIST",
      payload: { title: "새 재생목록" },
    }) as { success: boolean; playlist: { id: string } };

    expect(res.success).toBe(true);
    expect(res.playlist.id).toBe("new-pl");
    expect(clearTempList).toHaveBeenCalled();
  });

  it("영상 추가 실패 시 재생목록 롤백", async () => {
    (getTempList as jest.Mock).mockResolvedValueOnce([
      { videoId: "v1", title: "영상1", thumbnail: "" },
    ]);
    (createPlaylist as jest.Mock).mockResolvedValueOnce({
      id: "new-pl",
      title: "새 재생목록",
      description: "",
      privacyStatus: "private",
      itemCount: 0,
      publishedAt: "2024-01-01",
    });
    const { addItemToPlaylist } = jest.requireMock("../../background/youtube-api");
    (addItemToPlaylist as jest.Mock).mockRejectedValueOnce(new Error("추가 실패"));

    const res = await sendMessage({
      type: "CREATE_PLAYLIST",
      payload: { title: "새 재생목록" },
    }) as { success: boolean };

    expect(res.success).toBe(false);
    expect(deletePlaylist).toHaveBeenCalledWith("new-pl");
  });
});

describe("UPDATE_PLAYLIST", () => {
  it("payload 없으면 실패", async () => {
    const res = await sendMessage({
      type: "UPDATE_PLAYLIST",
      payload: { playlistId: "pl1" },
    }) as { success: boolean };
    expect(res.success).toBe(false);
  });

  it("재생목록 수정 성공", async () => {
    const { updatePlaylist } = jest.requireMock("../../background/youtube-api");
    (updatePlaylist as jest.Mock).mockResolvedValueOnce({
      id: "pl1",
      title: "수정된 제목",
      description: "",
      privacyStatus: "public",
      itemCount: 3,
      publishedAt: "2024-01-01",
    });
    (getCachedPlaylists as jest.Mock).mockResolvedValueOnce([
      { id: "pl1", title: "기존 제목", description: "", privacyStatus: "private", itemCount: 3, publishedAt: "2024-01-01" },
    ]);

    const res = await sendMessage({
      type: "UPDATE_PLAYLIST",
      payload: { playlistId: "pl1", title: "수정된 제목", privacyStatus: "public" },
    }) as { success: boolean; playlists: { title: string }[] };

    expect(res.success).toBe(true);
    expect(res.playlists[0].title).toBe("수정된 제목");
    expect(setCachedPlaylists).toHaveBeenCalled();
  });
});

describe("DELETE_PLAYLIST", () => {
  it("payload 없으면 실패", async () => {
    const res = await sendMessage({
      type: "DELETE_PLAYLIST",
      payload: {},
    }) as { success: boolean };
    expect(res.success).toBe(false);
  });

  it("재생목록 삭제 성공", async () => {
    (getCachedPlaylists as jest.Mock).mockResolvedValueOnce([
      { id: "pl1", title: "삭제할 재생목록", description: "", privacyStatus: "private", itemCount: 0, publishedAt: "2024-01-01" },
      { id: "pl2", title: "유지할 재생목록", description: "", privacyStatus: "public", itemCount: 5, publishedAt: "2024-01-01" },
    ]);

    const res = await sendMessage({
      type: "DELETE_PLAYLIST",
      payload: { playlistId: "pl1" },
    }) as { success: boolean; playlists: { id: string }[] };

    expect(res.success).toBe(true);
    expect(res.playlists).toHaveLength(1);
    expect(res.playlists[0].id).toBe("pl2");
  });
});

describe("Unauthorized sender", () => {
  it("외부 sender 차단", async () => {
    const res = await sendMessage({ type: "GET_TEMP_LIST" }, "external-id") as { success: boolean };
    expect(res.success).toBe(false);
  });
});