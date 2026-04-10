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

function isLiveItem(item: Element): boolean {
  return !!item.querySelector("badge-shape.yt-badge-shape--thumbnail-live");
}

function resetAllCheckboxStates(): void {
  document.querySelectorAll("[data-ytpm-checkbox]").forEach((cb) => {
    const input = cb.querySelector("input") as HTMLInputElement | null;
    if (input) input.checked = false;
    (cb as HTMLElement).dataset.checked = "false";
  });
}

function injectCheckboxes(): void {
  if (!isLoggedIn) return;

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

// 초기 로그인 상태 확인
chrome.storage.local.get("userId").then(({ userId }) => {
  isLoggedIn = !!userId;
  if (isLoggedIn) injectCheckboxes();
});

onMutation(() => injectCheckboxes());

// yt-navigate-finish 이벤트로 SPA 네비게이션 감지
document.addEventListener("yt-navigate-finish", () => {
  removeHomeShortsCheckboxes();
  removeCheckboxes();
  injectCheckboxes();
});

// userId 변경 감지 - 로그인/로그아웃 처리
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !("userId" in changes)) return;
  const { newValue } = changes.userId;

  if (newValue) {
    // 로그인 시 체크박스 삽입
    isLoggedIn = true;
    injectCheckboxes();
  } else {
    // 로그아웃 시 체크박스 제거 및 체크 상태 초기화
    isLoggedIn = false;
    resetAllCheckboxStates();
    removeCheckboxes();
    removeHomeShortsCheckboxes();
  }
});

// tempList 변경 감지 - 체크 상태 동기화
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !("tempList" in changes)) return;
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
});