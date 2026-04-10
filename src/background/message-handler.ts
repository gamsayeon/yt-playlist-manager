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

async function updateAndRefreshPlaylists(
  updateFn: () => Promise<void>,
  sendResponse: SendResponse
): Promise<void> {
  try {
    await updateFn();
    const playlists = await getPlaylists();
    await setCachedPlaylists(playlists);
    sendResponse({ success: true, playlists });
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
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
        (async () => {
          try {
            await addToTempList(video);
            const list = await getTempList();
            sendResponse({ success: true, list });
          } catch (error) {
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        })();
        return true;
      }

      case "REMOVE_FROM_TEMP_LIST": {
        // videoId만 있으면 삭제 가능 - title, thumbnail 불필요
        const videoId = message.payload?.videoId;
        if (!videoId) {
          sendResponse({ success: false, error: "Invalid payload" });
          return true;
        }
        (async () => {
          try {
            await removeFromTempList(videoId);
            const list = await getTempList();
            sendResponse({ success: true, list });
          } catch (error) {
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        })();
        return true;
      }

      case "GET_TEMP_LIST":
        (async () => {
          try {
            const list = await getTempList();
            sendResponse({ success: true, list });
          } catch (error) {
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        })();
        return true;

      case "CLEAR_TEMP_LIST":
        (async () => {
          try {
            await clearTempList();
            const list = await getTempList();
            sendResponse({ success: true, list });
          } catch (error) {
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        })();
        return true;

      case "GET_PLAYLISTS":
        (async () => {
          try {
            const cached = await getCachedPlaylists();
            if (cached) {
              sendResponse({ success: true, playlists: cached });
              return;
            }
            const playlists: Playlist[] = await getPlaylists();
            await setCachedPlaylists(playlists);
            sendResponse({ success: true, playlists });
          } catch (error) {
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        })();
        return true;

      case "CREATE_PLAYLIST": {
        const title = message.payload?.title;
        if (!title) {
          sendResponse({ success: false, error: "Invalid payload" });
          return true;
        }
        (async () => {
          try {
            const playlist = await createPlaylist(title);
            await clearTempList();
            const playlists = await getPlaylists();
            await setCachedPlaylists(playlists);
            // playlists, list 함께 반환 - UI 즉시 반영 및 일관성
            sendResponse({ success: true, playlist, playlists, list: [] });
          } catch (error) {
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        })();
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