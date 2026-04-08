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
  parseChannelVideoInfo,
  injectChannelCheckbox,
  injectShortsPageCheckbox,
} from "./checkbox";
import { onMutation } from "./observer";

console.log("[YT Playlist Manager] content script loaded");

function injectCheckboxes(): void {
  const path = location.pathname;

  if (path.startsWith("/shorts/")) {
    injectShortsPageCheckbox();
    return;
  }

  document.querySelectorAll("ytd-rich-item-renderer").forEach((item) => {
    const isShorts = !!item.querySelector("a.shortsLockupViewModelHostEndpoint");

    if (isShorts) {
      const videoInfo = parseHomeShortsInfo(item);
      if (videoInfo) injectHomeShortsCheckbox(item, videoInfo);
    } else {
      const videoInfo = parseHomeVideoInfo(item);
      if (videoInfo) injectHomeVideoCheckbox(item, videoInfo);
    }
  });

  document.querySelectorAll("ytd-grid-video-renderer").forEach((item) => {
    const videoInfo = parseChannelVideoInfo(item);
    if (videoInfo) injectChannelCheckbox(item, videoInfo);
  });

  document.querySelectorAll("ytd-video-renderer").forEach((item) => {
    const videoInfo = parseSearchVideoInfo(item);
    if (videoInfo) injectSearchCheckbox(item, videoInfo);
  });

  document.querySelectorAll(".ytGridShelfViewModelGridShelfItem").forEach((item) => {
    const videoInfo = parseSearchShortsInfo(item);
    if (videoInfo) injectSearchShortsCheckbox(item, videoInfo);
  });

  document.querySelectorAll("yt-lockup-view-model").forEach((item) => {
    const videoInfo = parseWatchVideoInfo(item);
    if (videoInfo) injectWatchCheckbox(item, videoInfo);
  });
}

injectCheckboxes();

onMutation(() => {
  injectCheckboxes();
});

let lastPath = location.pathname;

const urlObserver = new MutationObserver(() => {
  if (location.pathname !== lastPath) {
    lastPath = location.pathname;
    // URL 변경 시 홈피드 쇼츠 fixed 체크박스 제거
    removeHomeShortsCheckboxes();
    setTimeout(() => injectCheckboxes(), 500);
  }
});

urlObserver.observe(document.body, { childList: true, subtree: true });