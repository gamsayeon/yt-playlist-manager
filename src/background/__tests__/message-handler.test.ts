import { registerMessageHandler } from "../message-handler";

jest.mock("../storage", () => ({
  getTempList: jest.fn(),
  addToTempList: jest.fn(),
  removeFromTempList: jest.fn(),
  clearTempList: jest.fn(),
  getCachedPlaylists: jest.fn(),
  setCachedPlaylists: jest.fn(),
}));

jest.mock("../youtube-api", () => ({
  getPlaylists: jest.fn(),
  createPlaylist: jest.fn(),
  deletePlaylist: jest.fn(),
  addItemToPlaylist: jest.fn(),
  removeItemFromPlaylist: jest.fn(),
}));

import {
  getTempList,
  addToTempList,
  removeFromTempList,
  clearTempList,
  getCachedPlaylists,
  setCachedPlaylists,
} from "../storage";

import {
  getPlaylists,
  createPlaylist,
  deletePlaylist,
  addItemToPlaylist,
  removeItemFromPlaylist,
} from "../youtube-api";

const mockVideo = {
  videoId: "video1",
  title: "테스트 영상",
  thumbnail: "https://example.com/thumb.jpg",
};

const mockPlaylists = [{ id: "pl1", title: "재생목록 1", itemCount: 3 }];

const EXTENSION_ID = "test-extension-id";

const internalSender: chrome.runtime.MessageSender = { id: EXTENSION_ID };
const externalSender: chrome.runtime.MessageSender = { id: "other-extension-id" };

Object.defineProperty(chrome.runtime, "id", {
  value: EXTENSION_ID,
  writable: true,
});

let registeredListener: (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
) => boolean | void;

function sendMessage(
  message: { type: string; payload?: unknown },
  sender: chrome.runtime.MessageSender = internalSender
): Promise<unknown> {
  return new Promise((resolve) => {
    registeredListener(message, sender, resolve);
  });
}

beforeAll(() => {
  jest.spyOn(chrome.runtime.onMessage, "addListener").mockImplementation(
    (listener: unknown) => {
      registeredListener = listener as typeof registeredListener;
    }
  );
});

afterAll(() => {
  jest.restoreAllMocks();
});

beforeEach(() => {
  jest.clearAllMocks();
  registerMessageHandler();

  (getTempList as jest.Mock).mockResolvedValue([mockVideo]);
  (addToTempList as jest.Mock).mockResolvedValue(undefined);
  (removeFromTempList as jest.Mock).mockResolvedValue(undefined);
  (clearTempList as jest.Mock).mockResolvedValue(undefined);
  (getCachedPlaylists as jest.Mock).mockResolvedValue(null);
  (setCachedPlaylists as jest.Mock).mockResolvedValue(undefined);
  (getPlaylists as jest.Mock).mockResolvedValue(mockPlaylists);
  (createPlaylist as jest.Mock).mockResolvedValue({
    id: "pl1",
    title: "새 재생목록",
    itemCount: 0,
  });
  (deletePlaylist as jest.Mock).mockResolvedValue(undefined);
  (addItemToPlaylist as jest.Mock).mockResolvedValue(undefined);
  (removeItemFromPlaylist as jest.Mock).mockResolvedValue(undefined);
});

describe("외부 sender 차단", () => {
  it("외부 sender의 메시지를 차단한다", async () => {
    const response = await sendMessage({ type: "GET_TEMP_LIST" }, externalSender);
    expect(response).toEqual({ success: false, error: "Unauthorized sender" });
  });

  it("내부 sender의 메시지는 처리한다", async () => {
    const response = await sendMessage({ type: "GET_TEMP_LIST" }, internalSender);
    expect(response).toEqual({ success: true, list: [mockVideo] });
  });
});

describe("ADD_TO_TEMP_LIST", () => {
  it("유효한 payload로 영상을 추가한다", async () => {
    const response = await sendMessage({
      type: "ADD_TO_TEMP_LIST",
      payload: mockVideo,
    });
    expect(addToTempList).toHaveBeenCalledWith(mockVideo);
    expect(response).toEqual({ success: true, list: [mockVideo] });
  });

  it("payload가 불완전하면 Invalid payload를 반환한다", async () => {
    const response = await sendMessage({
      type: "ADD_TO_TEMP_LIST",
      payload: { videoId: "video1" },
    });
    expect(response).toEqual({ success: false, error: "Invalid payload" });
    expect(addToTempList).not.toHaveBeenCalled();
  });
});

describe("REMOVE_FROM_TEMP_LIST", () => {
  it("유효한 payload로 영상을 제거한다", async () => {
    const response = await sendMessage({
      type: "REMOVE_FROM_TEMP_LIST",
      payload: mockVideo,
    });
    expect(removeFromTempList).toHaveBeenCalledWith("video1");
    expect(response).toEqual({ success: true, list: [mockVideo] });
  });

  it("videoId만 있는 payload로 영상을 제거한다", async () => {
    const response = await sendMessage({
      type: "REMOVE_FROM_TEMP_LIST",
      payload: { videoId: "video1" },
    });
    expect(removeFromTempList).toHaveBeenCalledWith("video1");
    expect(response).toEqual({ success: true, list: [mockVideo] });
  });

  it("videoId가 없으면 Invalid payload를 반환한다", async () => {
    const response = await sendMessage({
      type: "REMOVE_FROM_TEMP_LIST",
      payload: {},
    });
    expect(response).toEqual({ success: false, error: "Invalid payload" });
    expect(removeFromTempList).not.toHaveBeenCalled();
  });
});

describe("GET_TEMP_LIST", () => {
  it("임시 리스트를 반환한다", async () => {
    const response = await sendMessage({ type: "GET_TEMP_LIST" });
    expect(getTempList).toHaveBeenCalled();
    expect(response).toEqual({ success: true, list: [mockVideo] });
  });
});

describe("CLEAR_TEMP_LIST", () => {
  it("임시 리스트를 초기화한다", async () => {
    (getTempList as jest.Mock).mockResolvedValue([]);
    const response = await sendMessage({ type: "CLEAR_TEMP_LIST" });
    expect(clearTempList).toHaveBeenCalled();
    expect(response).toEqual({ success: true, list: [] });
  });
});

describe("GET_PLAYLISTS", () => {
  it("캐시가 있으면 캐시를 반환한다", async () => {
    (getCachedPlaylists as jest.Mock).mockResolvedValue(mockPlaylists);
    const response = await sendMessage({ type: "GET_PLAYLISTS" });
    expect(getPlaylists).not.toHaveBeenCalled();
    expect(response).toEqual({ success: true, playlists: mockPlaylists });
  });

  it("캐시가 없으면 API를 호출하고 캐시를 갱신한다", async () => {
    const response = await sendMessage({ type: "GET_PLAYLISTS" });
    expect(getPlaylists).toHaveBeenCalled();
    expect(setCachedPlaylists).toHaveBeenCalledWith(mockPlaylists);
    expect(response).toEqual({ success: true, playlists: mockPlaylists });
  });

  it("API 오류 시 success: false를 반환한다", async () => {
    (getPlaylists as jest.Mock).mockRejectedValue(new Error("API 오류"));
    const response = await sendMessage({ type: "GET_PLAYLISTS" });
    expect(response).toEqual({ success: false, error: "API 오류" });
  });
});

describe("CREATE_PLAYLIST", () => {
  it("재생목록을 생성하고 tempList를 초기화하며 playlists와 list를 함께 반환한다", async () => {
    (getTempList as jest.Mock).mockResolvedValue([]);
    const response = await sendMessage({
      type: "CREATE_PLAYLIST",
      payload: { title: "새 재생목록" },
    });
    expect(createPlaylist).toHaveBeenCalledWith("새 재생목록");
    expect(clearTempList).toHaveBeenCalled();
    expect(setCachedPlaylists).toHaveBeenCalled();
    expect(response).toEqual({
      success: true,
      playlist: { id: "pl1", title: "새 재생목록", itemCount: 0 },
      playlists: mockPlaylists,
      list: [],
    });
  });

  it("title이 없으면 Invalid payload를 반환한다", async () => {
    const response = await sendMessage({
      type: "CREATE_PLAYLIST",
      payload: {},
    });
    expect(response).toEqual({ success: false, error: "Invalid payload" });
    expect(createPlaylist).not.toHaveBeenCalled();
  });
});

describe("DELETE_PLAYLIST", () => {
  it("재생목록을 삭제하고 캐시를 갱신한다", async () => {
    const response = await sendMessage({
      type: "DELETE_PLAYLIST",
      payload: { playlistId: "pl1" },
    });
    expect(deletePlaylist).toHaveBeenCalledWith("pl1");
    expect(setCachedPlaylists).toHaveBeenCalled();
    expect(response).toEqual({ success: true, playlists: mockPlaylists });
  });

  it("playlistId가 없으면 Invalid payload를 반환한다", async () => {
    const response = await sendMessage({
      type: "DELETE_PLAYLIST",
      payload: {},
    });
    expect(response).toEqual({ success: false, error: "Invalid payload" });
    expect(deletePlaylist).not.toHaveBeenCalled();
  });
});

describe("ADD_TO_PLAYLIST", () => {
  it("재생목록에 영상을 추가하고 캐시를 갱신한다", async () => {
    const response = await sendMessage({
      type: "ADD_TO_PLAYLIST",
      payload: { playlistId: "pl1", videoId: "video1" },
    });
    expect(addItemToPlaylist).toHaveBeenCalledWith("pl1", "video1");
    expect(setCachedPlaylists).toHaveBeenCalled();
    expect(response).toEqual({ success: true, playlists: mockPlaylists });
  });

  it("playlistId 또는 videoId가 없으면 Invalid payload를 반환한다", async () => {
    const response = await sendMessage({
      type: "ADD_TO_PLAYLIST",
      payload: { playlistId: "pl1" },
    });
    expect(response).toEqual({ success: false, error: "Invalid payload" });
    expect(addItemToPlaylist).not.toHaveBeenCalled();
  });
});

describe("REMOVE_FROM_PLAYLIST", () => {
  it("재생목록에서 영상을 제거하고 캐시를 갱신한다", async () => {
    const response = await sendMessage({
      type: "REMOVE_FROM_PLAYLIST",
      payload: { playlistItemId: "item1" },
    });
    expect(removeItemFromPlaylist).toHaveBeenCalledWith("item1");
    expect(setCachedPlaylists).toHaveBeenCalled();
    expect(response).toEqual({ success: true, playlists: mockPlaylists });
  });

  it("playlistItemId가 없으면 Invalid payload를 반환한다", async () => {
    const response = await sendMessage({
      type: "REMOVE_FROM_PLAYLIST",
      payload: {},
    });
    expect(response).toEqual({ success: false, error: "Invalid payload" });
    expect(removeItemFromPlaylist).not.toHaveBeenCalled();
  });
});

describe("unknown 메시지 타입", () => {
  it("알 수 없는 메시지 타입은 false를 반환한다", () => {
    const result = registeredListener(
      { type: "UNKNOWN_TYPE" },
      internalSender,
      () => {}
    );
    expect(result).toBe(false);
  });
});