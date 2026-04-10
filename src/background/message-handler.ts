import { VideoItem } from "../types";
import {
  getTempList,
  addToTempList,
  removeFromTempList,
  clearTempList,
  getCachedPlaylists,
  setCachedPlaylists,
  Playlist,
} from "./storage";
import {
  getPlaylists,
  createPlaylist,
  deletePlaylist,
  addItemToPlaylist,
  removeItemFromPlaylist,
} from "./youtube-api";

type SendResponse = (response: {
  success: boolean;
  list?: VideoItem[];
  playlists?: Playlist[];
  playlist?: Playlist;
  error?: string;
}) => void;

function isInternalSender(sender: chrome.runtime.MessageSender): boolean {
  return sender.id === chrome.runtime.id;
}

// 비동기 핸들러 공통 래퍼
async function handleAsync(
  sendResponse: SendResponse,
  fn: () => Promise<void>
): Promise<void> {
  try {
    await fn();
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// 재생목록 API 호출 후 캐시 갱신 공통 헬퍼
async function updateAndRefreshPlaylists(
  updateFn: () => Promise<void>,
  sendResponse: SendResponse
): Promise<void> {
  await handleAsync(sendResponse, async () => {
    await updateFn();
    const playlists = await getPlaylists();
    await setCachedPlaylists(playlists);
    sendResponse({ success: true, playlists });
  });
}

export function registerMessageHandler(): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!isInternalSender(sender)) {
      sendResponse({ success: false, error: "Unauthorized sender" });
      return false;
    }

    switch (message.type) {
      case "ADD_TO_TEMP_LIST": {
        const video = message.payload as VideoItem;
        if (!video?.videoId || !video?.title || !video?.thumbnail) {
          sendResponse({ success: false, error: "Invalid payload" });
          return true;
        }
        handleAsync(sendResponse, async () => {
          await addToTempList(video);
          const list = await getTempList();
          sendResponse({ success: true, list });
        });
        return true;
      }

      case "REMOVE_FROM_TEMP_LIST": {
        const videoId = message.payload?.videoId;
        if (!videoId) {
          sendResponse({ success: false, error: "Invalid payload" });
          return true;
        }
        handleAsync(sendResponse, async () => {
          await removeFromTempList(videoId);
          const list = await getTempList();
          sendResponse({ success: true, list });
        });
        return true;
      }

      case "GET_TEMP_LIST":
        handleAsync(sendResponse, async () => {
          const list = await getTempList();
          sendResponse({ success: true, list });
        });
        return true;

      case "CLEAR_TEMP_LIST":
        handleAsync(sendResponse, async () => {
          await clearTempList();
          const list = await getTempList();
          sendResponse({ success: true, list });
        });
        return true;

      case "GET_PLAYLISTS":
        handleAsync(sendResponse, async () => {
          const cached = await getCachedPlaylists();
          if (cached) {
            sendResponse({ success: true, playlists: cached });
            return;
          }
          const playlists: Playlist[] = await getPlaylists();
          await setCachedPlaylists(playlists);
          sendResponse({ success: true, playlists });
        });
        return true;

      case "CREATE_PLAYLIST": {
        const title = message.payload?.title;
        if (!title) {
          sendResponse({ success: false, error: "Invalid payload" });
          return true;
        }
        handleAsync(sendResponse, async () => {
          const playlist = await createPlaylist(title);
          await clearTempList();
          const playlists = await getPlaylists();
          await setCachedPlaylists(playlists);
          // getTempList()로 실제 값 반환 - 데이터 일관성 보장
          const list = await getTempList();
          sendResponse({ success: true, playlist, playlists, list });
        });
        return true;
      }

      case "DELETE_PLAYLIST": {
        const playlistId = message.payload?.playlistId;
        if (!playlistId) {
          sendResponse({ success: false, error: "Invalid payload" });
          return true;
        }
        updateAndRefreshPlaylists(
          () => deletePlaylist(playlistId),
          sendResponse
        );
        return true;
      }

      case "ADD_TO_PLAYLIST": {
        const { playlistId, videoId } = message.payload ?? {};
        if (!playlistId || !videoId) {
          sendResponse({ success: false, error: "Invalid payload" });
          return true;
        }
        updateAndRefreshPlaylists(
          () => addItemToPlaylist(playlistId, videoId),
          sendResponse
        );
        return true;
      }

      case "REMOVE_FROM_PLAYLIST": {
        const { playlistItemId } = message.payload ?? {};
        if (!playlistItemId) {
          sendResponse({ success: false, error: "Invalid payload" });
          return true;
        }
        updateAndRefreshPlaylists(
          () => removeItemFromPlaylist(playlistItemId),
          sendResponse
        );
        return true;
      }

      default:
        return false;
    }
  });
}