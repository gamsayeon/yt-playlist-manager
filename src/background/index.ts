import { login, logout } from "./auth";
import { Message } from "../types/message";

console.log("[YT Playlist Manager] service worker loaded");

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  if (message.type === "LOGIN") {
    login()
      .then((userId) => sendResponse({ success: true, userId }))
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        sendResponse({ success: false, error: message });
      });
    return true;
  }

  if (message.type === "LOGOUT") {
    logout()
      .then(() => sendResponse({ success: true }))
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        sendResponse({ success: false, error: message });
      });
    return true;
  }

  return false;
});