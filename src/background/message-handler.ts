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
            const playlist = await createPlaylist(title);
            await clearTempList();
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

      case "DELETE_PLAYLIST": {
        const playlistId = message.payload?.playlistId;
        if (!playlistId) {
          sendResponse({ success: false, error: "Invalid payload" });
          return true;
        }
        (async () => {
          try {
            await deletePlaylist(playlistId);
            const playlists = await getPlaylists();
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
      }

      case "ADD_TO_PLAYLIST": {
        const { playlistId, videoId } = message.payload ?? {};
        if (!playlistId || !videoId) {
          sendResponse({ success: false, error: "Invalid payload" });
          return true;
        }
        (async () => {
          try {
            await addItemToPlaylist(playlistId, videoId);
            const playlists = await getPlaylists();
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
      }

      case "REMOVE_FROM_PLAYLIST": {
        const { playlistItemId } = message.payload ?? {};
        if (!playlistItemId) {
          sendResponse({ success: false, error: "Invalid payload" });
          return true;
        }
        (async () => {
          try {
            await removeItemFromPlaylist(playlistItemId);
            const playlists = await getPlaylists();
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
      }

      default:
        return false;
    }
  });
}