import {
  parseHomeVideoInfo,
  injectHomeVideoCheckbox,
  parseHomeShortsInfo,
  injectHomeShortsCheckbox,
  removeHomeShortsCheckboxes,
  parseSearchVideoInfo,
  parseSearchShortsInfo,
  injectSearchCheckbox,
  injectSearchShortsCheckbox,
  parseWatchVideoInfo,
  injectWatchCheckbox,
  parseWatchShortsInfo,
  injectWatchShortsCheckbox,
  parseChannelVideoInfo,
  injectChannelCheckbox,
  injectShortsPageCheckbox,
  removeCheckboxes,
} from "./checkbox";
import { onMutation } from "./observer";

console.log("[YT Playlist Manager] content script loaded");

let isLoggedIn = false;
let isNavigating = false;
const pendingItems = new Set<Element>();

function isLiveItem(item: Element): boolean {
  return !!item.querySelector("badge-shape.yt-badge-shape--thumbnail-live");
}

function tryInjectRichItem(item: Element): void {
  if (item.closest("ytd-rich-shelf-renderer[has-rounded-box-art-thumbnail-style]")) return;
  if (isLiveItem(item)) return;

  const isShorts = !!item.querySelector("a.shortsLockupViewModelHostEndpoint");
  if (isShorts) {
    const videoInfo = parseHomeShortsInfo(item);
    if (videoInfo && videoInfo.thumbnail) {
      injectHomeShortsCheckbox(item, videoInfo);
      pendingItems.delete(item);
    } else {
      pendingItems.add(item);
    }
  } else {
    const videoInfo = parseHomeVideoInfo(item);
    if (videoInfo && videoInfo.thumbnail) {
      injectHomeVideoCheckbox(item, videoInfo);
      pendingItems.delete(item);
    } else {
      pendingItems.add(item);
    }
  }
}

function retryPendingItems(): void {
  if (pendingItems.size === 0) return;
  pendingItems.forEach((item) => {
    if (!document.contains(item)) {
      pendingItems.delete(item);
      return;
    }
    tryInjectRichItem(item);
  });
}

function injectCheckboxes(): void {
  if (!isLoggedIn) return;
  if (isNavigating) return;

  const path = location.pathname;

  if (path.startsWith("/shorts/")) {
    injectShortsPageCheckbox();
    return;
  }

  retryPendingItems();

  document.querySelectorAll("ytd-rich-item-renderer").forEach((item) => {
    tryInjectRichItem(item);
  });

  document
    .querySelectorAll("ytd-rich-item-renderer:has(ytd-rich-grid-media)")
    .forEach((item) => {
      if (item.querySelector("a.shortsLockupViewModelHostEndpoint")) return;
      if (isLiveItem(item)) return;
      const videoInfo = parseChannelVideoInfo(item);
      if (videoInfo) injectChannelCheckbox(item, videoInfo);
    });

  document.querySelectorAll("ytd-grid-video-renderer").forEach((item) => {
    if (isLiveItem(item)) return;
    const videoInfo = parseChannelVideoInfo(item);
    if (videoInfo) injectChannelCheckbox(item, videoInfo);
  });

  document.querySelectorAll("ytd-video-renderer").forEach((item) => {
    if (isLiveItem(item)) return;
    const videoInfo = parseSearchVideoInfo(item);
    if (videoInfo) injectSearchCheckbox(item, videoInfo);
  });

  document.querySelectorAll(".ytGridShelfViewModelGridShelfItem").forEach((item) => {
    const videoInfo = parseSearchShortsInfo(item);
    if (videoInfo) injectSearchShortsCheckbox(item, videoInfo);
  });

  document.querySelectorAll("yt-lockup-view-model").forEach((item) => {
    if (item.closest("ytd-rich-shelf-renderer[has-rounded-box-art-thumbnail-style]")) return;
    if (isLiveItem(item)) return;
    const videoInfo = parseWatchVideoInfo(item);
    if (videoInfo) injectWatchCheckbox(item, videoInfo);
  });

  document
    .querySelectorAll("ytd-reel-shelf-renderer ytm-shorts-lockup-view-model-v2")
    .forEach((item) => {
      const videoInfo = parseWatchShortsInfo(item);
      if (videoInfo) injectWatchShortsCheckbox(item, videoInfo);
    });
}

chrome.storage.local.get("userId").then(({ userId }) => {
  isLoggedIn = !!userId;
  if (isLoggedIn) injectCheckboxes();
});

onMutation(() => injectCheckboxes());

document.addEventListener("yt-navigate-start", () => {
  isNavigating = true;
  pendingItems.clear();
  removeHomeShortsCheckboxes();
  removeCheckboxes();
});

document.addEventListener("yt-navigate-finish", () => {
  isNavigating = false;
  injectCheckboxes();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;

  if ("userId" in changes) {
    const { newValue } = changes.userId;
    if (newValue) {
      isLoggedIn = true;
      pendingItems.clear();
      removeCheckboxes();
      removeHomeShortsCheckboxes();
      injectCheckboxes();
    } else {
      isLoggedIn = false;
      pendingItems.clear();
      removeCheckboxes();
      removeHomeShortsCheckboxes();
    }
  }

  if ("tempList" in changes) {
    const list: { videoId: string }[] = changes.tempList.newValue ?? [];
    const checkedIds = new Set(list.map((v) => v.videoId));

    document.querySelectorAll("[data-ytpm-checkbox]").forEach((cb) => {
      const input = cb.querySelector("input") as HTMLInputElement | null;
      const videoId = (cb as HTMLElement).dataset.videoId;
      if (input && videoId) {
        input.checked = checkedIds.has(videoId);
        (cb as HTMLElement).dataset.checked = String(input.checked);
      }
    });
  }
});