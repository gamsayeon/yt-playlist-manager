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
import { getPlaylists, createPlaylist } from "./youtube-api";

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
            // API 호출로 재생목록 생성
            const playlist = await createPlaylist(title);

            // tempList 초기화
            await clearTempList();

            // 캐시 갱신
            const playlists = await getPlaylists();
            await setCachedPlaylists(playlists);

            sendResponse({ success: true, playlist });
          } catch (error) {
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        })();
        return true;
      }

      default:
        return false;
    }
  });
}