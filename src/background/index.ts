import { login, logout } from "./auth";

console.log("[YT Playlist Manager] service worker loaded");

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "LOGIN") {
    login()
      .then((userId) => sendResponse({ success: true, userId }))
      .catch((error) => sendResponse({ success: false, error }));
    return true;
  }

  if (message.type === "LOGOUT") {
    logout()
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error }));
    return true;
  }
});