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

  // 홈/채널 피드 - 게임 섹션 제외
  document.querySelectorAll("ytd-rich-item-renderer").forEach((item) => {
    if (item.closest("ytd-rich-shelf-renderer[has-rounded-box-art-thumbnail-style]")) return;

    const isShorts = !!item.querySelector("a.shortsLockupViewModelHostEndpoint");
    if (isShorts) {
      const videoInfo = parseHomeShortsInfo(item);
      if (videoInfo) injectHomeShortsCheckbox(item, videoInfo);
    } else {
      const videoInfo = parseHomeVideoInfo(item);
      if (videoInfo) injectHomeVideoCheckbox(item, videoInfo);
    }
  });

  // 채널 동영상 탭 - ytd-rich-grid-media 사용
  document.querySelectorAll("ytd-rich-item-renderer:has(ytd-rich-grid-media)").forEach((item) => {
    if (item.querySelector("a.shortsLockupViewModelHostEndpoint")) return;
    const videoInfo = parseChannelVideoInfo(item);
    if (videoInfo) injectChannelCheckbox(item, videoInfo);
  });

  // 검색 일반+쇼츠
  document.querySelectorAll("ytd-video-renderer").forEach((item) => {
    const videoInfo = parseSearchVideoInfo(item);
    if (videoInfo) injectSearchCheckbox(item, videoInfo);
  });

  // 검색 쇼츠 그리드
  document.querySelectorAll(".ytGridShelfViewModelGridShelfItem").forEach((item) => {
    const videoInfo = parseSearchShortsInfo(item);
    if (videoInfo) injectSearchShortsCheckbox(item, videoInfo);
  });

  // /watch 추천 영상 - 게임 섹션 제외
  document.querySelectorAll("yt-lockup-view-model").forEach((item) => {
    if (item.closest("ytd-rich-shelf-renderer[has-rounded-box-art-thumbnail-style]")) return;
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
    removeHomeShortsCheckboxes();
    setTimeout(() => injectCheckboxes(), 500);
  }
});

urlObserver.observe(document.body, { childList: true, subtree: true });