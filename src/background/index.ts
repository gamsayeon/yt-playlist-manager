import { VideoItem } from "../types";

const tempList: VideoItem[] = [];

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "ADD_TO_TEMP_LIST") {
    const videoId = (message.payload as VideoItem)?.videoId;
    if (!videoId) {
      sendResponse({ success: false, error: "Invalid payload" });
      return true;
    }
    const payload = message.payload as VideoItem;
    const exists = tempList.some((item) => item.videoId === payload.videoId);
    if (!exists) {
      tempList.push(payload);
    }
    sendResponse({ success: true, list: tempList });
    return true;
  }

  if (message.type === "REMOVE_FROM_TEMP_LIST") {
    const videoId = (message.payload as VideoItem)?.videoId;
    if (!videoId) {
      sendResponse({ success: false, error: "Invalid payload" });
      return true;
    }
    const index = tempList.findIndex((item) => item.videoId === videoId);
    if (index !== -1) {
      tempList.splice(index, 1);
    }
    sendResponse({ success: true, list: tempList });
    return true;
  }

  if (message.type === "GET_TEMP_LIST") {
    sendResponse({ success: true, list: tempList });
    return true;
  }

  if (message.type === "CLEAR_TEMP_LIST") {
    tempList.length = 0;
    sendResponse({ success: true, list: tempList });
    return true;
  }

  return false;
});