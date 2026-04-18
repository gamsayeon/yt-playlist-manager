import { registerMessageHandler } from "../../background/message-handler";

jest.mock("../../background/youtube-api", () => ({
  getPlaylists: jest.fn(),
  getPlaylistItems: jest.fn(),
  createPlaylist: jest.fn(),
  updatePlaylist: jest.fn(),
  deletePlaylist: jest.fn(),
  addItemToPlaylist: jest.fn(),
  removeItemFromPlaylist: jest.fn(),
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

import { getPlaylistItems } from "../../background/youtube-api";
import {
  getTempList,
  addToTempListBatch,
  removeFromTempListByPlaylistId,
} from "../../background/storage";

const sendMessage = (
  message: unknown,
  senderId = chrome.runtime.id
): Promise<unknown> => {
  return new Promise((resolve) => {
    const sender = { id: senderId } as chrome.runtime.MessageSender;
    const listeners = (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls;
    const listener = listeners[listeners.length - 1][0];
    listener(message, sender, resolve);
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
    const res = await sendMessage({ type: "GET_PLAYLIST_ITEMS_FOR_TEMP", payload: {} }) as { success: boolean };
    expect(res.success).toBe(false);
  });

  it("타인 채널 비공개 영상 필터링", async () => {
    (getPlaylistItems as jest.Mock).mockResolvedValueOnce([
      { videoId: "v1", title: "공개", thumbnail: "", privacyStatus: "public", playlistItemId: "i1" },
      { videoId: "v2", title: "비공개", thumbnail: "", privacyStatus: "private", playlistItemId: "i2" },
    ]);
    (getTempList as jest.Mock).mockResolvedValueOnce([]);

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
    (getTempList as jest.Mock).mockResolvedValueOnce([]);

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
    const res = await sendMessage({ type: "REMOVE_PLAYLIST_ITEMS_FROM_TEMP", payload: {} }) as { success: boolean };
    expect(res.success).toBe(false);
  });

  it("재생목록 영상 일괄 제거", async () => {
    (getTempList as jest.Mock).mockResolvedValueOnce([]);
    const res = await sendMessage({
      type: "REMOVE_PLAYLIST_ITEMS_FROM_TEMP",
      payload: { playlistId: "pl1" },
    }) as { success: boolean };

    expect(res.success).toBe(true);
    expect(removeFromTempListByPlaylistId).toHaveBeenCalledWith("pl1");
  });
});

describe("Unauthorized sender", () => {
  it("외부 sender 차단", async () => {
    const res = await sendMessage({ type: "GET_TEMP_LIST" }, "external-id") as { success: boolean };
    expect(res.success).toBe(false);
  });
});