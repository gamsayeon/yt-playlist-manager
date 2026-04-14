import { VideoItem } from "../types";
import {
  getTempList,
  addToTempList,
  removeFromTempList,
  clearTempList,
  getCachedPlaylists,
  setCachedPlaylists,
  invalidatePlaylists,
  Playlist,
} from "./storage";
import {
  getPlaylists,
  getPlaylistItems,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addItemToPlaylist,
  removeItemFromPlaylist,
  PrivacyStatus,
  PlaylistItem,
} from "./youtube-api";
import { login, logout } from "./auth";

type SendResponse = (response: {
  success: boolean;
  userId?: string;
  list?: VideoItem[];
  playlists?: Playlist[];
  playlist?: Playlist;
  playlistItems?: PlaylistItem[];
  error?: string;
}) => void;

const VALID_PRIVACY_STATUSES: PrivacyStatus[] = ["public", "unlisted", "private"];

function isValidPrivacyStatus(value: unknown): value is PrivacyStatus {
  return VALID_PRIVACY_STATUSES.includes(value as PrivacyStatus);
}

function isInternalSender(sender: chrome.runtime.MessageSender): boolean {
  return sender.id === chrome.runtime.id;
}

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

// ✅ 캐시에서 특정 재생목록 itemCount 직접 수정
async function updateCachedItemCount(
  playlistId: string,
  delta: number
): Promise<Playlist[] | null> {
  const cached = await getCachedPlaylists();
  if (!cached) return null;

  const updated = cached.map((p) => {
    if (p.id !== playlistId) return p;
    return {
      ...p,
      itemCount: Math.max(0, p.itemCount + delta),
    };
  });
  await setCachedPlaylists(updated);
  return updated;
}

export function registerMessageHandler(): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!isInternalSender(sender)) {
      sendResponse({ success: false, error: "Unauthorized sender" });
      return false;
    }

    switch (message.type) {
      case "LOGIN":
        handleAsync(sendResponse, async () => {
          const userId = await login();
          sendResponse({ success: true, userId });
        });
        return true;

      case "LOGOUT":
        handleAsync(sendResponse, async () => {
          await logout();
          sendResponse({ success: true });
        });
        return true;

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
          sendResponse({ success: true, list: [] });
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

      case "REFRESH_PLAYLISTS":
        handleAsync(sendResponse, async () => {
          await invalidatePlaylists();
          const playlists: Playlist[] = await getPlaylists();
          await setCachedPlaylists(playlists);
          sendResponse({ success: true, playlists });
        });
        return true;

      case "GET_PLAYLIST_ITEMS": {
        const { playlistId } = message.payload ?? {};
        if (!playlistId) {
          sendResponse({ success: false, error: "Invalid payload" });
          return true;
        }
        handleAsync(sendResponse, async () => {
          const playlistItems = await getPlaylistItems(playlistId);
          sendResponse({ success: true, playlistItems });
        });
        return true;
      }

      case "CREATE_PLAYLIST": {
        const { title, description, privacyStatus } = message.payload ?? {};
        if (!title) {
          sendResponse({ success: false, error: "Invalid payload" });
          return true;
        }

        const validatedPrivacyStatus: PrivacyStatus = isValidPrivacyStatus(privacyStatus)
          ? privacyStatus
          : "private";

        handleAsync(sendResponse, async () => {
          const tempItems = await getTempList();
          if (tempItems.length === 0) {
            throw new Error("재생목록에 추가할 영상이 없습니다.");
          }

          const playlist = await createPlaylist(
            title,
            description ?? "",
            validatedPrivacyStatus
          );

          try {
            for (const video of tempItems) {
              await addItemToPlaylist(playlist.id, video.videoId);
            }
          } catch (error) {
            try {
              await deletePlaylist(playlist.id);
            } catch (rollbackError) {
              console.error("[YTPM] 재생목록 롤백 실패:", rollbackError);
            }
            throw error;
          }

          await clearTempList();

          // ✅ 캐시에 새 재생목록 추가
          const cached = await getCachedPlaylists();
          const newPlaylist: Playlist = {
            id: playlist.id,
            title: playlist.title,
            description: playlist.description,
            privacyStatus: playlist.privacyStatus,
            itemCount: tempItems.length,
          };

          let playlists: Playlist[];
          if (cached) {
            playlists = [newPlaylist, ...cached];
            await setCachedPlaylists(playlists);
          } else {
            playlists = await getPlaylists();
            await setCachedPlaylists(playlists);
          }

          sendResponse({ success: true, playlist, playlists, list: [] });
        });
        return true;
      }

      case "UPDATE_PLAYLIST": {
        const { playlistId, title, description, privacyStatus, removedCount } =
          message.payload ?? {};
        if (!playlistId || !title) {
          sendResponse({ success: false, error: "Invalid payload" });
          return true;
        }

        const validatedPrivacyStatus: PrivacyStatus = isValidPrivacyStatus(privacyStatus)
          ? privacyStatus
          : "private";

        handleAsync(sendResponse, async () => {
          await updatePlaylist(
            playlistId,
            title,
            description ?? "",
            validatedPrivacyStatus
          );

          // ✅ 캐시에서 해당 재생목록 직접 수정
          const cached = await getCachedPlaylists();
          let playlists: Playlist[];
          if (cached) {
            playlists = cached.map((p) => {
              if (p.id !== playlistId) return p;
              return {
                ...p,
                title,
                description: description ?? "",
                privacyStatus: validatedPrivacyStatus,
                itemCount: Math.max(0, p.itemCount - (removedCount ?? 0)),
              };
            });
            await setCachedPlaylists(playlists);
          } else {
            playlists = await getPlaylists();
            await setCachedPlaylists(playlists);
          }

          sendResponse({ success: true, playlists });
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

      case "ADD_TEMP_TO_PLAYLIST": {
        const { playlistId } = message.payload ?? {};
        if (!playlistId) {
          sendResponse({ success: false, error: "Invalid payload" });
          return true;
        }
        handleAsync(sendResponse, async () => {
          const tempItems = await getTempList();
          if (tempItems.length === 0) {
            throw new Error("추가할 영상이 없습니다.");
          }

          for (const video of tempItems) {
            await addItemToPlaylist(playlistId, video.videoId);
            await removeFromTempList(video.videoId);
          }

          // ✅ 캐시에서 itemCount 직접 증가
          const updated = await updateCachedItemCount(playlistId, tempItems.length);
          let playlists: Playlist[];
          if (updated) {
            playlists = updated;
          } else {
            playlists = await getPlaylists();
            await setCachedPlaylists(playlists);
          }

          sendResponse({ success: true, playlists, list: [] });
        });
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
        handleAsync(sendResponse, async () => {
          await removeItemFromPlaylist(playlistItemId);
          sendResponse({ success: true });
        });
        return true;
      }

      default:
        return false;
    }
  });
}