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

// ✅ data-ytpm-processed 속성 전체 초기화
function clearProcessedAttributes(): void {
  document.querySelectorAll("[data-ytpm-processed]").forEach((el) => {
    el.removeAttribute("data-ytpm-processed");
  });
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

// ✅ 채널 비디오 처리까지 통합 - 단일 루프에서 모든 ytd-rich-item-renderer 처리
function tryInjectRichItem(item: Element): void {
  if (item.closest("ytd-rich-shelf-renderer[has-rounded-box-art-thumbnail-style]")) return;
  if (isLiveItem(item)) return;

  const processed = (item as HTMLElement).dataset.ytpmProcessed;
  const currentVideoId = getVideoId(item);

  // 같은 videoId로 이미 처리된 요소 → 스킵
  if (processed && processed === currentVideoId) return;

  const isShorts = !!item.querySelector("a.shortsLockupViewModelHostEndpoint");

  if (isShorts) {
    const videoInfo = parseHomeShortsInfo(item);
    if (videoInfo) {
      injectHomeShortsCheckbox(item, videoInfo);
      (item as HTMLElement).dataset.ytpmProcessed = videoInfo.videoId;
    }
    return;
  }

  // 채널 비디오 (ytd-rich-grid-media 포함)
  if (item.querySelector("ytd-rich-grid-media")) {
    const videoInfo = parseChannelVideoInfo(item);
    if (videoInfo) {
      injectChannelCheckbox(item, videoInfo);
      (item as HTMLElement).dataset.ytpmProcessed = videoInfo.videoId;
    }
    return;
  }

  // 일반 홈피드 영상
  const videoInfo = parseHomeVideoInfo(item);
  if (videoInfo) {
    injectHomeVideoCheckbox(item, videoInfo);
    (item as HTMLElement).dataset.ytpmProcessed = videoInfo.videoId;
  }
}

function injectCheckboxes(): void {
  if (!isLoggedIn) return;
  if (isNavigating) return;

  const path = location.pathname;

  if (path.startsWith("/shorts/")) {
    injectShortsPageCheckbox();
    return;
  }

  // ✅ 단일 루프로 통합
  document.querySelectorAll("ytd-rich-item-renderer").forEach((item) => {
    tryInjectRichItem(item);
  });

  // ytd-grid-video-renderer (채널 탭)
  document.querySelectorAll("ytd-grid-video-renderer").forEach((item) => {
    if (isLiveItem(item)) return;
    const videoInfo = parseChannelVideoInfo(item);
    if (videoInfo) injectChannelCheckbox(item, videoInfo);
  });

  // 검색 결과 일반 영상
  document.querySelectorAll("ytd-video-renderer").forEach((item) => {
    if (isLiveItem(item)) return;
    const videoInfo = parseSearchVideoInfo(item);
    if (videoInfo) injectSearchCheckbox(item, videoInfo);
  });

  // 검색 결과 쇼츠
  document.querySelectorAll(".ytGridShelfViewModelGridShelfItem").forEach((item) => {
    const videoInfo = parseSearchShortsInfo(item);
    if (videoInfo) injectSearchShortsCheckbox(item, videoInfo);
  });

  // /watch 추천 영상
  document.querySelectorAll("yt-lockup-view-model").forEach((item) => {
    if (item.closest("ytd-rich-shelf-renderer[has-rounded-box-art-thumbnail-style]")) return;
    if (isLiveItem(item)) return;
    const videoInfo = parseWatchVideoInfo(item);
    if (videoInfo) injectWatchCheckbox(item, videoInfo);
  });

  // /watch 쇼츠
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

// ✅ 네비게이션 시 data-ytpm-processed 초기화
document.addEventListener("yt-navigate-start", () => {
  isNavigating = true;
  removeHomeShortsCheckboxes();
  removeCheckboxes();
  clearProcessedAttributes();
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
      // ✅ 로그인 상태 변경 시 data-ytpm-processed 초기화
      clearProcessedAttributes();
      injectCheckboxes();
    } else {
      isLoggedIn = false;
      removeCheckboxes();
      removeHomeShortsCheckboxes();
      clearProcessedAttributes();
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