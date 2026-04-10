import { VideoItem } from "../types";

const tempList: VideoItem[] = [];

type SendResponse = (response: {
  success: boolean;
  list?: VideoItem[];
  error?: string;
}) => void;

function handleAddToTempList(payload: unknown, sendResponse: SendResponse): void {
  const videoId = (payload as VideoItem)?.videoId;
  if (!videoId) {
    sendResponse({ success: false, error: "Invalid payload" });
    return;
  }
  const item = payload as VideoItem;
  const exists = tempList.some((v) => v.videoId === item.videoId);
  if (!exists) {
    tempList.push(item);
  }
  sendResponse({ success: true, list: tempList });
}

function handleRemoveFromTempList(payload: unknown, sendResponse: SendResponse): void {
  const videoId = (payload as VideoItem)?.videoId;
  if (!videoId) {
    sendResponse({ success: false, error: "Invalid payload" });
    return;
  }
  const index = tempList.findIndex((v) => v.videoId === videoId);
  if (index !== -1) {
    tempList.splice(index, 1);
  }
  sendResponse({ success: true, list: tempList });
}

function handleGetTempList(sendResponse: SendResponse): void {
  sendResponse({ success: true, list: tempList });
}

function handleClearTempList(sendResponse: SendResponse): void {
  tempList.length = 0;
  sendResponse({ success: true, list: tempList });
}

export function registerMessageHandler(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.type) {
      case "ADD_TO_TEMP_LIST":
        handleAddToTempList(message.payload, sendResponse);
        return true;

      case "REMOVE_FROM_TEMP_LIST":
        handleRemoveFromTempList(message.payload, sendResponse);
        return true;

      case "GET_TEMP_LIST":
        handleGetTempList(sendResponse);
        return true;

      case "CLEAR_TEMP_LIST":
        handleClearTempList(sendResponse);
        return true;

      default:
        return false;
    }
  });
}