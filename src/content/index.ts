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

function isLiveItem(item: Element): boolean {
  return !!item.querySelector("badge-shape.yt-badge-shape--thumbnail-live");
}

function tryInjectRichItem(item: Element): void {
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
}

function getVideoId(item: Element): string | null {
  const isShorts = !!item.querySelector("a.shortsLockupViewModelHostEndpoint");
  if (isShorts) {
    const link = item.querySelector(
      "a.shortsLockupViewModelHostEndpoint[tabindex='-1']"
    ) as HTMLAnchorElement | null;
    return link?.href.match(/\/shorts\/([^?&]+)/)?.[1] ?? null;
  }
  const link = item.querySelector(
    "a.yt-lockup-view-model__content-image, a.ytLockupViewModelContentImage"
  ) as HTMLAnchorElement | null;
  return link?.href.match(/[?&]v=([^&]+)/)?.[1] ?? null;
}

function injectCheckboxes(): void {
  if (!isLoggedIn) return;
  if (isNavigating) return;

  const path = location.pathname;

  if (path.startsWith("/shorts/")) {
    injectShortsPageCheckbox();
    return;
  }

  // ✅ 이미 처리된 요소는 건너뜀 (videoId가 다르면 재처리)
  document.querySelectorAll("ytd-rich-item-renderer").forEach((item) => {
    const processed = (item as HTMLElement).dataset.ytpmProcessed;
    const currentVideoId = getVideoId(item);

    // videoId가 같으면 이미 처리된 요소 → 스킵
    if (processed && processed === currentVideoId) return;

    tryInjectRichItem(item);

    // 처리 완료 표시
    if (currentVideoId) {
      (item as HTMLElement).dataset.ytpmProcessed = currentVideoId;
    }
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
      removeCheckboxes();
      removeHomeShortsCheckboxes();
      injectCheckboxes();
    } else {
      isLoggedIn = false;
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