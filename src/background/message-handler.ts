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
import { getPlaylists } from "./youtube-api";

export function registerMessageHandler(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.type) {
      case "ADD_TO_TEMP_LIST": {
        const videoId = (message.payload as VideoItem)?.videoId;
        if (!videoId) {
          sendResponse({ success: false, error: "Invalid payload" });
          return true;
        }
        addToTempList(message.payload as VideoItem).then(async () => {
          const list = await getTempList();
          sendResponse({ success: true, list });
        });
        return true;
      }

      case "REMOVE_FROM_TEMP_LIST": {
        const videoId = (message.payload as VideoItem)?.videoId;
        if (!videoId) {
          sendResponse({ success: false, error: "Invalid payload" });
          return true;
        }
        removeFromTempList(videoId).then(async () => {
          const list = await getTempList();
          sendResponse({ success: true, list });
        });
        return true;
      }

      case "GET_TEMP_LIST":
        getTempList().then((list) => {
          sendResponse({ success: true, list });
        });
        return true;

      case "CLEAR_TEMP_LIST":
        clearTempList().then(async () => {
          const list = await getTempList();
          sendResponse({ success: true, list });
        });
        return true;

      case "GET_PLAYLISTS":
        (async () => {
          try {
            // 캐시 우선 반환
            const cached = await getCachedPlaylists();
            if (cached) {
              sendResponse({ success: true, playlists: cached });
              return;
            }

            // 캐시 만료 시 API 호출
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

      default:
        return false;
    }
  });
}