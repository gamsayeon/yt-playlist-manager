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

function isLiveItem(item: Element): boolean {
  return !!item.querySelector("badge-shape.yt-badge-shape--thumbnail-live");
}

function injectCheckboxes(): void {
  const path = location.pathname;

  if (path.startsWith("/shorts/")) {
    injectShortsPageCheckbox();
    return;
  }

  document.querySelectorAll("ytd-rich-item-renderer").forEach((item) => {
    if (item.closest("ytd-rich-shelf-renderer[has-rounded-box-art-thumbnail-style]")) return;
    if (isLiveItem(item)) return;

    const isShorts = !!item.querySelector("a.shortsLockupViewModelHostEndpoint");
    if (isShorts) {
      const videoInfo = parseHomeShortsInfo(item);
      if (videoInfo) injectHomeShortsCheckbox(item, videoInfo);
    } else {
      const videoInfo = parseHomeVideoInfo(item);
      if (videoInfo) injectHomeVideoCheckbox(item, videoInfo);
    }
  });

  document.querySelectorAll("ytd-rich-item-renderer:has(ytd-rich-grid-media)").forEach((item) => {
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

  document.querySelectorAll(
    "ytd-reel-shelf-renderer ytm-shorts-lockup-view-model-v2"
  ).forEach((item) => {
    const videoInfo = parseWatchShortsInfo(item);
    if (videoInfo) injectWatchShortsCheckbox(item, videoInfo);
  });
}

injectCheckboxes();
onMutation(() => injectCheckboxes());

// yt-navigate-finish 이벤트로 SPA 네비게이션 감지
document.addEventListener("yt-navigate-finish", () => {
  removeHomeShortsCheckboxes();
  removeCheckboxes();
  injectCheckboxes();
});