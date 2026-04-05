import { login, logout } from "./auth";
import { addToTempList, removeFromTempList, VideoItem } from "./storage";
import { Message } from "../types/message";

console.log("[YT Playlist Manager] service worker loaded");

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  if (message.type === "LOGIN" || message.type === "LOGOUT") {
    (async () => {
      try {
        if (message.type === "LOGIN") {
          const userId = await login();
          sendResponse({ success: true, userId });
        } else {
          await logout();
          sendResponse({ success: true });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        sendResponse({ success: false, error: errorMsg });
      }
    })();
    return true;
  }

  if (message.type === "ADD_TO_TEMP_LIST") {
    addToTempList(message.payload as VideoItem)
      .then(() => sendResponse({ success: true }))
      .catch((error) => {
        const errorMsg = error instanceof Error ? error.message : String(error);
        sendResponse({ success: false, error: errorMsg });
      });
    return true;
  }

  if (message.type === "REMOVE_FROM_TEMP_LIST") {
    const videoId = (message.payload as VideoItem).videoId;
    removeFromTempList(videoId)
      .then(() => sendResponse({ success: true }))
      .catch((error) => {
        const errorMsg = error instanceof Error ? error.message : String(error);
        sendResponse({ success: false, error: errorMsg });
      });
    return true;
  }

  return false;
});